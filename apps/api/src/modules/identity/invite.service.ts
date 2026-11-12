import { hashToken } from '@ethica/db';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as authService from './auth.service.js';
import * as inviteRepository from './invite.repository.js';
import type { AcceptInvite, InvitePeek } from './invite.schema.js';

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
