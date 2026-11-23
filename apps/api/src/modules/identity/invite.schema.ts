import type { AcceptInvite, CreateInvite, Permissions, Role } from '@ethica/contracts';
import { acceptInviteSchema, createInviteSchema, inviteTokenParamSchema } from '@ethica/contracts';
import type { MailProvider } from '@ethica/mail';
import type { RequestHandler } from 'express';

export type { AcceptInvite, CreateInvite, Permissions, Role };
// MOD-08: input schemas and module types in a single place.
export { acceptInviteSchema, createInviteSchema, inviteTokenParamSchema };

export type InviteMailDeps = { mailProvider: MailProvider; inviteBaseUrl: string };
export type InviteRouterDeps = InviteMailDeps & { validToken: RequestHandler };

export type InviteResult = { id: string; sent: boolean };

export type CreateInviteInput = {
  tenant: string;
  email: string;
  role: Role;
  permissions?: Permissions;
  tokenHash: string;
  expiresAt: Date;
  invitedBy: string;
};

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
