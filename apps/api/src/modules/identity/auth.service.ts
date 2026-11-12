import crypto from 'node:crypto';
import { hashToken } from '@ethica/db';
import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { MailProvider } from '../../providers/mail/index.js';
import * as activityLogService from './activityLog.service.js';
import * as authRepository from './auth.repository.js';
import type {
  AccessKeyVerify,
  DeviceKind,
  PasskeyResponse,
  SessionView,
  Signup,
  TenantUser,
  UpdatePermissions,
} from './auth.schema.js';

// AD-155: no password — the person's mailbox proves who they are.
// AD-220: every session is born from the passkey of the device (WebAuthn).
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_KEY_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
// The passkey belongs to the site of the web app: the page that runs the WebAuthn ceremony.
const RP_ID = new URL(env.CORS_ORIGIN).hostname;

// The code is hashed with the e-mail: the same 6 digits never produce the same hash for two people.
const hashCode = (email: string, code: string) => hashToken(`${email}:${code}`);

type Ticket = { user?: string; email?: string; challenge?: string; purpose?: string };

// Short signed tickets carry one step to the next (office creation, passkey creation, WebAuthn
// challenge) without a collection of their own.
const signTicket = (payload: Ticket, expiresIn: '10m' | '30m') =>
  jwt.sign(payload, env.SESSION_JWT_SECRET, { expiresIn });

const readTicket = (token: string, purpose: string, error: 'invalid_access_key' | 'invalid_passkey'): Ticket => {
  try {
    const decoded = jwt.verify(token, env.SESSION_JWT_SECRET) as Ticket;
    if (decoded.purpose === purpose) return decoded;
  } catch {
    // expired or forged — same answer below
  }
  throw new CustomError(error, 401);
};

// APA-03: the confirmed e-mail (or the accepted invite, APA-04) only allows creating the passkey
// of this device.
export const passkeyTicket = (userId: string) => signTicket({ user: userId, purpose: 'passkey' }, '10m');

// The single place that opens a session, always from a passkey (APA-07). AWAITED before the
// controller builds the cookie (Risk 5): the first /auth/session never gets a 401.
const startSession = async (
  user: { id: string; tenant?: string },
  deviceInfo: string,
  passkeyId: string,
): Promise<string> => {
  // jwtid: two sessions of the same person in the same second would otherwise share the token.
  const sessionToken = jwt.sign({ user: user.id }, env.SESSION_JWT_SECRET, {
    expiresIn: '30d',
    jwtid: crypto.randomUUID(),
  });
  await authRepository.createSession({
    user: user.id,
    tenant: user.tenant,
    passkey: passkeyId,
    tokenHash: hashToken(sessionToken),
    deviceInfo,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  // Signing in goes to the activity log (AD-134); whoever has no tenant (platform) does not.
  if (user.tenant)
    void activityLogService.record({ tenantId: user.tenant, userId: user.id, module: 'account', action: 'signin' });
  return sessionToken;
};

// ACE-01/02: always the same answer, registered or not (does not reveal who has an account).
// A deactivated account gets nothing; an unknown e-mail gets the key to create its office (ACE-04).
export const requestAccessKey = async (email: string, mailProvider: MailProvider, accessUrl: string): Promise<void> => {
  const user = await authRepository.findUserByEmail(email);
  if (user && !user.active) return;

  const token = crypto.randomBytes(32).toString('hex');
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await authRepository.replaceAccessKey({
    email,
    tokenHash: hashToken(token),
    codeHash: hashCode(email, code),
    expiresAt: new Date(Date.now() + ACCESS_KEY_TTL_MS),
  });

  const link = `${accessUrl}?token=${token}`;
  const { sent } = await mailProvider.send(
    email,
    `Sua chave de acesso ao Ethica: ${code}`,
    `<p>Use o botão abaixo para entrar no Ethica:</p>
<p><a href="${link}">Entrar no Ethica</a></p>
<p>Ou digite este código na tela de acesso: <strong>${code}</strong></p>
<p>Ao entrar, o Ethica pede para ativar o acesso no aparelho (digital, rosto ou PIN).</p>
<p>A chave vale por 15 minutos e só pode ser usada uma vez. Se não foi você quem pediu, ignore este e-mail.</p>`,
  );
  if (!sent) throw new CustomError('email_send_failed', 502);
};

// ACE-02/03: consumes the key (link or code). With an account it leads to the passkey of this
// device (APA-03); without one it returns a short ticket (30 min) for the office creation (ACE-04).
export const verifyAccessKey = async (
  data: AccessKeyVerify,
): Promise<{ passkeyToken: string } | { signupToken: string }> => {
  const email = 'token' in data ? await consumeByToken(data.token) : await consumeByCode(data.email, data.code);

  const user = await authRepository.findUserByEmail(email);
  if (!user) return { signupToken: signTicket({ email, purpose: 'signup' }, '30m') };
  if (!user.active) throw new CustomError('invalid_access_key', 401);
  return { passkeyToken: passkeyTicket(user.id) };
};

const consumeByToken = async (token: string): Promise<string> => {
  const email = await authRepository.consumeAccessKeyByToken(hashToken(token));
  if (!email) throw new CustomError('invalid_access_key', 401);
  return email;
};

// Each try spends one attempt before the comparison; the 5th wrong one leaves the key unusable.
const consumeByCode = async (email: string, code: string): Promise<string> => {
  const key = await authRepository.spendCodeAttempt(email, MAX_CODE_ATTEMPTS);
  if (key?.codeHash !== hashCode(email, code) || !(await authRepository.deleteAccessKey(key.id))) {
    throw new CustomError('invalid_access_key', 401);
  }
  return email;
};

// ACE-04: open sign-up — the confirmed e-mail creates an active office and becomes its admin.
// The session only opens with the passkey (APA-04).
export const signup = async (data: Signup): Promise<{ passkeyToken: string }> => {
  const { email } = readTicket(data.signupToken, 'signup', 'invalid_access_key');
  if (!email) throw new CustomError('invalid_access_key', 401);
  if (await authRepository.findUserByEmail(email)) throw new CustomError('email_already_registered', 409);
  if (await authRepository.tenantDocumentExists(data.document))
    throw new CustomError('document_already_registered', 409);

  const user = await authRepository.createOfficeWithAdmin({
    email,
    name: data.name,
    officeName: data.officeName,
    document: data.document,
  });
  return { passkeyToken: passkeyTicket(user.id) };
};

// APA-05: the kind comes from the browser that creates the passkey — the same one the session
// is bound to (deviceInfo). iPadOS reports itself as a Mac and counts as a computer.
const deviceKind = (userAgent: string): DeviceKind =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? 'mobile' : 'desktop';

const deviceLabel = (userAgent: string): string => {
  const system =
    [
      ['iPhone', /iPhone/],
      ['iPad', /iPad/],
      ['Android', /Android/],
      ['Windows', /Windows/],
      ['macOS', /Macintosh|Mac OS X/],
      ['Linux', /Linux/],
    ].find(([, pattern]) => (pattern as RegExp).test(userAgent))?.[0] ?? '';
  const browser =
    [
      ['Edge', /Edg\//],
      ['Opera', /OPR\//],
      ['Firefox', /Firefox|FxiOS/],
      ['Chrome', /Chrome|CriOS/],
      ['Safari', /Safari/],
    ].find(([, pattern]) => (pattern as RegExp).test(userAgent))?.[0] ?? '';
  return [browser, system].filter(Boolean).join(' · ') || 'Web';
};

const activeUser = async (userId: string | undefined) => {
  const user = userId ? await authRepository.findUserById(userId) : null;
  if (!user?.active) throw new CustomError('invalid_passkey', 401);
  return user;
};

// APA-03/06: options to create the passkey of this device — the device's own authenticator
// (fingerprint, face, PIN or Windows Hello), discoverable, with user verification.
export const passkeyRegistrationOptions = async (passkeyToken: string) => {
  const ticket = readTicket(passkeyToken, 'passkey', 'invalid_passkey');
  const user = await activeUser(ticket.user);
  const view = await authRepository.findUserView(user.id);
  if (!view) throw new CustomError('invalid_passkey', 401);

  const options = await generateRegistrationOptions({
    rpName: 'Ethica',
    rpID: RP_ID,
    userName: view.email,
    userDisplayName: view.name,
    // The same id on every device: the browser hands it back when signing in.
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
  });
  const challengeToken = signTicket(
    { user: user.id, challenge: options.challenge, purpose: 'passkey-register' },
    '10m',
  );
  return { options, challengeToken };
};

// APA-05: the new passkey replaces the previous one of the same kind (and ends its sessions).
export const registerPasskey = async (data: PasskeyResponse, userAgent: string): Promise<string> => {
  const ticket = readTicket(data.challengeToken, 'passkey-register', 'invalid_passkey');
  const user = await activeUser(ticket.user);
  const response = data.response as unknown as RegistrationResponseJSON;
  // APA-06: a security key or "use your phone" (cross-platform) is not this device.
  if (response.authenticatorAttachment === 'cross-platform') throw new CustomError('invalid_passkey', 401);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: ticket.challenge as string,
    expectedOrigin: env.CORS_ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  }).catch(() => null);
  if (!verification?.verified) throw new CustomError('invalid_passkey', 401);

  const { credential, credentialBackedUp } = verification.registrationInfo;
  const passkeyId = await authRepository.replacePasskey({
    user: user.id,
    kind: deviceKind(userAgent),
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
    backedUp: credentialBackedUp,
    label: deviceLabel(userAgent),
  });
  return startSession(user, userAgent, passkeyId);
};

// APA-02: sign-in without e-mail — the browser offers the passkeys it has for the site.
export const passkeySigninOptions = async () => {
  const options = await generateAuthenticationOptions({ rpID: RP_ID, userVerification: 'required' });
  return { options, challengeToken: signTicket({ challenge: options.challenge, purpose: 'passkey-signin' }, '10m') };
};

export const signinWithPasskey = async (data: PasskeyResponse, userAgent: string): Promise<string> => {
  const ticket = readTicket(data.challengeToken, 'passkey-signin', 'invalid_passkey');
  const response = data.response as unknown as AuthenticationResponseJSON;
  const passkey = await authRepository.findPasskey(response.id);
  if (!passkey) throw new CustomError('invalid_passkey', 401);
  const user = await activeUser(passkey.user);

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: ticket.challenge as string,
    expectedOrigin: env.CORS_ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: passkey.counter,
      transports: passkey.transports,
    },
    requireUserVerification: true,
  }).catch(() => null);
  if (!verification?.verified) throw new CustomError('invalid_passkey', 401);

  await authRepository.touchPasskey(passkey.id, verification.authenticationInfo.newCounter);
  return startSession(user, userAgent, passkey.id);
};

// No token validation on purpose: logout has to work even with the
// session already expired/revoked (the controller clears the cookie
// anyway). Whoever has the token could already use it — deleting their session gives
// nobody access to anything more.
export const signout = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  await authRepository.deleteSessionByTokenHash(hashToken(token));
};

// req.tenantUser already came from the database (createAuthMiddleware — FND-05); here it only
// adds the display fields (name, e-mail, status) that the minimal TenantUser
// payload does not carry — another database read, never the token.
export const getSessionView = async (tenantUser: TenantUser): Promise<SessionView> => {
  const user = await authRepository.findUserView(tenantUser.user);
  if (!user) throw new CustomError('invalid_session', 401, 'usuário não encontrado');

  const tenant = tenantUser.tenant ? await authRepository.findTenantView(tenantUser.tenant) : undefined;

  return { tenant: tenant ?? undefined, user, role: tenantUser.role, permissions: tenantUser.permissions };
};

// MOD-07: batch read for other modules (order.getOrder — T13)
// to resolve a user name without a second query per item.
export const findUserNamesByIds = authRepository.findUserNamesByIds;

// Tenant directory, used by the "assignee" filter of the conversation
// queue (inbox) — same shape as findUserNamesByIds, without the `$in` of ids.
export const listUsers = (tenantId: string, options: { activeOnly?: boolean } = {}) =>
  authRepository.listUsers(tenantId, options);

// AD-137: the admin adjusts a member's matrix; admin has everything and has no matrix.
export const updatePermissions = async (tenantId: string, userId: string, data: UpdatePermissions) => {
  const target = await authRepository.findUserRole(tenantId, userId);
  if (!target) throw new CustomError('not_found', 404);
  if (target.includes('admin')) throw new CustomError('admin_has_all_permissions', 422);
  await authRepository.updatePermissions(tenantId, userId, data.permissions);
};

// REG-07 (AD-071): full directory for the users screen (admin only).
export const listUserDirectory = (tenantId: string) => authRepository.listUserDirectory(tenantId);

// ACC-06: photo bytes of a tenant user.
export const getUserAvatar = async (tenantId: string, userId: string) => {
  const avatar = await authRepository.findUserAvatar(tenantId, userId);
  if (!avatar) throw new CustomError('not_found', 404);
  return avatar;
};

// MOD-04: other modules (conversation.service — T15) resolve the name of ONE
// User (e.g. who has taken over the conversation) only through here, never through the
// repository — same shape as authRepository.findUserView.
export const findUserView = authRepository.findUserView;

// MOD-04/MOD-05 (T21): card.service.assertReferencesExist confirma a
// a User's existence (assignee) only through here, never with `User.exists`
// direto.
export const userExists = authRepository.userExists;

// ENR-07: assignee eligibility (active User of the same tenant).
export const userIsActive = authRepository.userIsActive;
