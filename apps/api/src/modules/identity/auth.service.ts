import crypto from 'node:crypto';
import { hashToken } from '@ethica/db';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { MailProvider } from '../../providers/mail/index.js';
import * as activityLogService from './activityLog.service.js';
import * as authRepository from './auth.repository.js';
import type {
  AccessKeyVerify,
  PasswordAccess,
  SessionView,
  Signup,
  TenantUser,
  UpdatePermissions,
} from './auth.schema.js';

// AD-155: no password — the person's mailbox proves who they are.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_KEY_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

// The code is hashed with the e-mail: the same 6 digits never produce the same hash for two people.
const hashCode = (email: string, code: string) => hashToken(`${email}:${code}`);

// The single place that opens a session (sign-in, sign-up and invite acceptance). AWAITED
// before the controller builds the cookie (Risk 5): the first /auth/session never gets a 401.
export const startSession = async (user: { id: string; tenant?: string }, deviceInfo: string): Promise<string> => {
  // jwtid: two sessions of the same person in the same second would otherwise share the token.
  const sessionToken = jwt.sign({ user: user.id }, env.SESSION_JWT_SECRET, {
    expiresIn: '30d',
    jwtid: crypto.randomUUID(),
  });
  await authRepository.createSession({
    user: user.id,
    tenant: user.tenant,
    tokenHash: hashToken(sessionToken),
    deviceInfo,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
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
<p>A chave vale por 15 minutos e só pode ser usada uma vez. Se não foi você quem pediu, ignore este e-mail.</p>`,
  );
  if (!sent) throw new CustomError('email_send_failed', 502);
};

// ACE-02/03: consumes the key (link or code). With an account it opens the session; without
// one it returns a short ticket (30 min) for the office creation step (ACE-04).
export const verifyAccessKey = async (
  data: AccessKeyVerify,
  deviceInfo: string,
): Promise<{ sessionToken: string } | { signupToken: string }> => {
  const email = 'token' in data ? await consumeByToken(data.token) : await consumeByCode(data.email, data.code);

  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    return { signupToken: jwt.sign({ email, purpose: 'signup' }, env.SESSION_JWT_SECRET, { expiresIn: '30m' }) };
  }
  if (!user.active) throw new CustomError('invalid_access_key', 401);

  const sessionToken = await startSession(user, deviceInfo);
  // Signing in goes to the activity log (AD-134); whoever has no tenant (platform) does not.
  if (user.tenant)
    void activityLogService.record({ tenantId: user.tenant, userId: user.id, module: 'account', action: 'signin' });
  return { sessionToken };
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

// AD-157: test sign-up while sending e-mail is blocked. A known e-mail with a password signs in;
// a new e-mail gets the same office creation ticket as the key, carrying the password hash.
export const passwordAccess = async (
  data: PasswordAccess,
  deviceInfo: string,
): Promise<{ sessionToken: string } | { signupToken: string }> => {
  const user = await authRepository.findUserWithPasswordHash(data.email);
  if (!user) {
    const passwordHash = hashPassword(data.password);
    const signupToken = jwt.sign({ email: data.email, passwordHash, purpose: 'signup' }, env.SESSION_JWT_SECRET, {
      expiresIn: '30m',
    });
    return { signupToken };
  }
  if (!user.active || !user.passwordHash || !passwordMatches(data.password, user.passwordHash)) {
    throw new CustomError('invalid_credentials', 401);
  }
  return { sessionToken: await startSession(user, deviceInfo) };
};

const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
};

const passwordMatches = (password: string, stored: string): boolean => {
  const [salt, hash] = stored.split(':');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), crypto.scryptSync(password, salt, 64));
};

// ACE-04: open sign-up — the confirmed e-mail creates an active office and becomes its admin.
export const signup = async (data: Signup, deviceInfo: string): Promise<string> => {
  const { email, passwordHash } = readSignupToken(data.signupToken);
  if (await authRepository.findUserByEmail(email)) throw new CustomError('email_already_registered', 409);
  if (await authRepository.tenantDocumentExists(data.document))
    throw new CustomError('document_already_registered', 409);

  const user = await authRepository.createOfficeWithAdmin({
    email,
    name: data.name,
    officeName: data.officeName,
    document: data.document,
    passwordHash,
  });
  return startSession(user, deviceInfo);
};

const readSignupToken = (signupToken: string): { email: string; passwordHash?: string } => {
  try {
    const decoded = jwt.verify(signupToken, env.SESSION_JWT_SECRET) as {
      email?: unknown;
      passwordHash?: unknown;
      purpose?: unknown;
    };
    if (decoded.purpose === 'signup' && typeof decoded.email === 'string') {
      return {
        email: decoded.email,
        passwordHash: typeof decoded.passwordHash === 'string' ? decoded.passwordHash : undefined,
      };
    }
  } catch {
    // expired or forged — same answer below
  }
  throw new CustomError('invalid_access_key', 401);
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
