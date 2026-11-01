import type { CreateInvite, Permissoes, ProvisionTenant, Role } from '@ethica/contracts';
import { createInviteSchema, idSchema, provisionTenantSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { MailProvider } from '../../providers/mail/index.js';

export type { CreateInvite, ProvisionTenant };
// MOD-08: schemas de entrada e tipos do módulo num lugar só.
export { createInviteSchema, provisionTenantSchema };

export const tenantIdParamSchema = z.object({ id: idSchema }).strict();

export type PlatformControllerDeps = {
  mailProvider: MailProvider;
  inviteBaseUrl: string;
};

export type PlatformRouterDeps = PlatformControllerDeps & { validToken: RequestHandler };

export type InviteResult = { id: string; sent: boolean };

export type CreateInviteInput = {
  tenant: string;
  email: string;
  role: Role;
  permissoes?: Permissoes;
  tokenHash: string;
  expiresAt: Date;
  invitedBy: string;
};
