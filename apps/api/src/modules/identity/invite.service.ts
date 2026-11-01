import { hashToken } from '@ethica/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as inviteRepository from './invite.repository.js';
import type { AcceptInvite, InvitePeek } from './invite.schema.js';

const SESSION_TTL_MS = 4 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 10;

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

export const acceptInvite = async (
  token: string,
  data: AcceptInvite,
  deviceInfo: string,
): Promise<{ sessionToken: string }> => {
  const invite = await inviteRepository.acceptInviteAtomic(hashToken(token));
  if (!invite) throw new CustomError('invalid_link', 410, 'convite inválido ou expirado');

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_COST);
  const user = await inviteRepository.createUserFromInvite({
    name: data.name,
    email: invite.email,
    password: hashedPassword,
    tenant: invite.tenant,
    role: invite.role,
    permissions: invite.permissions,
  });

  // provisioned -> active on the first accepted invite (FND-19); guarded no-op
  // if the tenant is already active (e.g. a second admin invited later).
  await inviteRepository.activateTenant(invite.tenant);

  const sessionToken = jwt.sign({ user: user.id }, env.SESSION_JWT_SECRET, { expiresIn: '4d' });
  await inviteRepository.createSession({
    user: user.id,
    tenant: invite.tenant,
    tokenHash: hashToken(sessionToken),
    deviceInfo,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  return { sessionToken };
};
