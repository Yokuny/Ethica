import crypto from 'node:crypto';
import { PERFIL_PERMISSOES } from '@ethica/contracts';
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

// Sem rollback quando o envio falha: o convite fica gravado e reenviável
// (FND-12) — lição do auth.service.ts de referência, resolvida sem desfazer
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

  // FND-13: reenviar para um e-mail com convite pending reaproveita — revoga
  // o anterior e emite um novo, nunca deixando dois válidos. O catch abaixo
  // continua como rede de segurança para a corrida genuína (duas revogações
  // concorrentes seguidas de dois creates); não é mais o caminho normal.
  await platformRepository.revokePendingInvites(tenantId, data.email);

  let invite: { id: string };
  try {
    invite = await platformRepository.createInvite({
      tenant: tenantId,
      email: data.email,
      role: data.role,
      // AD-137: admin tem tudo; o membro recebe a matriz conferida ou o preset do perfil.
      permissoes: data.role === 'admin' ? undefined : (data.permissoes ?? PERFIL_PERMISSOES[data.role]),
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
