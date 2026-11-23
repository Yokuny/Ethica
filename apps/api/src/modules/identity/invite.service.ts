import crypto from 'node:crypto';
import { PROFILE_PERMISSIONS } from '@ethica/contracts';
import { hashToken } from '@ethica/db';
import type { MailProvider } from '@ethica/mail';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import * as authService from './auth.service.js';
import * as inviteRepository from './invite.repository.js';
import type { AcceptInvite, CreateInvite, InvitePeek, InviteResult } from './invite.schema.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Three DISTINCT messages, never echoing the e-mail (FND-03/AC3): expired,
// already used (accepted) and invalid (missing/revoked) are different
// causes and deserve a different diagnosis for whoever got the link.
export const peekInvite = async (token: string): Promise<InvitePeek> => {
  const invite = await inviteRepository.findInviteWithTenantByHash(hashToken(token));

  if (!invite) throw new CustomError('invalid_link', 410);
  if (invite.status === 'accepted') throw new CustomError('used_link', 410);
  if (invite.expiresAt.getTime() < Date.now()) throw new CustomError('expired_link', 410);
  if (invite.status !== 'pending') throw new CustomError('invalid_link', 410);

  return { tenantName: invite.tenantName, email: invite.email };
};

export const acceptInvite = async (token: string, data: AcceptInvite): Promise<{ passkeyToken: string }> => {
  const invite = await inviteRepository.acceptInviteAtomic(hashToken(token));
  if (!invite) throw new CustomError('invalid_link', 410, 'convite inválido ou expirado');

  // ACE-05 (AD-155): the invite link already proves the e-mail — no password.
  // The e-mail may have created its own office in the meantime (ACE-04): unique e-mail (AD-016).
  const user = await inviteRepository
    .createUserFromInvite({
      name: data.name,
      email: invite.email,
      tenant: invite.tenant,
      role: invite.role,
      permissions: invite.permissions,
    })
    .catch((e: unknown) => {
      if ((e as { code?: unknown }).code === 11000) throw new CustomError('email_already_registered', 409);
      throw e;
    });

  // provisioned -> active on the first accepted invite (FND-19); guarded no-op
  // if the tenant is already active (e.g. a second admin invited later).
  await inviteRepository.activateTenant(invite.tenant);

  // APA-04 (AD-220): the session only opens with the passkey of this device.
  return { passkeyToken: authService.passkeyTicket(user.id) };
};

// No rollback when sending fails: the invite stays saved and resendable
// (FND-12) — lesson from the reference auth.service.ts, solved without undoing
// a escrita.
export const inviteToTenant = async (
  tenantId: string,
  data: CreateInvite,
  invitedBy: string,
  mailProvider: MailProvider,
  inviteBaseUrl: string,
): Promise<InviteResult> => {
  return issueInvite(tenantId, { ...data, role: 'admin' }, invitedBy, mailProvider, inviteBaseUrl);
};

export const inviteTeamMember = async (
  tenantId: string,
  data: CreateInvite,
  invitedBy: string,
  mailProvider: MailProvider,
  inviteBaseUrl: string,
): Promise<InviteResult> => {
  if (await inviteRepository.findUserByEmail(data.email)) {
    throw new CustomError('email_already_registered', 409);
  }
  return issueInvite(tenantId, data, invitedBy, mailProvider, inviteBaseUrl);
};

const issueInvite = async (
  tenantId: string,
  data: CreateInvite,
  invitedBy: string,
  mailProvider: MailProvider,
  inviteBaseUrl: string,
): Promise<InviteResult> => {
  const existingUser = await inviteRepository.findUserByEmailInTenant(tenantId, data.email);
  if (existingUser) {
    throw new CustomError('email_already_registered', 409);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

  // FND-13: resending to an e-mail with a pending invite reuses it — revokes
  // the previous one and issues a new one, never leaving two valid. The catch below
  // stays as a safety net for the genuine race (two concurrent
  // revocations followed by two creates); it is no longer the normal path.
  await inviteRepository.revokePendingInvites(tenantId, data.email);

  let invite: { id: string };
  try {
    invite = await inviteRepository.createInvite({
      tenant: tenantId,
      email: data.email,
      role: data.role,
      // AD-137: admin has everything; the member gets the granted matrix or the profile preset.
      permissions: data.role === 'admin' ? undefined : (data.permissions ?? PROFILE_PERMISSIONS[data.role]),
      tokenHash,
      expiresAt,
      invitedBy,
    });
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      throw new CustomError('pending_invite_exists', 409);
    }
    throw e;
  }

  const inviteUrl = `${inviteBaseUrl}?token=${token}`;
  const { sent } = await mailProvider.send(
    data.email,
    'Você foi convidado',
    `Acesse o link para concluir seu cadastro: ${inviteUrl}`,
  );

  if (sent) {
    await inviteRepository.markInviteSent(invite.id);
  }

  return { id: invite.id, sent };
};
