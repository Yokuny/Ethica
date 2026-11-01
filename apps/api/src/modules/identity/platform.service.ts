import crypto from 'node:crypto';
import { PROFILE_PERMISSIONS } from '@ethica/contracts';
import { hashToken } from '@ethica/db';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { MailProvider } from '../../providers/mail/index.js';
import * as platformRepository from './platform.repository.js';
import type { CreateInvite, InviteResult, ProvisionTenant } from './platform.schema.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

export const provisionTenant = (data: ProvisionTenant): Promise<{ id: string }> =>
  platformRepository.createTenant(data);

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
  if (await platformRepository.findUserByEmail(data.email)) {
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
  const existingUser = await platformRepository.findUserByEmailInTenant(tenantId, data.email);
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
  await platformRepository.revokePendingInvites(tenantId, data.email);

  let invite: { id: string };
  try {
    invite = await platformRepository.createInvite({
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
    await platformRepository.markInviteSent(invite.id);
  }

  return { id: invite.id, sent };
};
