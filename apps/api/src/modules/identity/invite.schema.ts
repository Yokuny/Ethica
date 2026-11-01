import type { AcceptInvite, Permissions, Role } from '@ethica/contracts';
import { acceptInviteSchema, inviteTokenParamSchema } from '@ethica/contracts';

export type { AcceptInvite, Permissions, Role };
// MOD-08: schemas de entrada e tipos do módulo num lugar só.
export { acceptInviteSchema, inviteTokenParamSchema };

export type InvitePeek = { tenantName: string; email: string };

export type InviteWithTenant = {
  id: string;
  tenant: string;
  tenantName: string;
  email: string;
  role: Role;
  permissions?: Permissions;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: Date;
};
