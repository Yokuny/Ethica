import type { ProvisionTenant } from '@ethica/contracts';
import { idSchema, provisionTenantSchema } from '@ethica/contracts';
import { z } from 'zod';
import type { InviteRouterDeps } from './invite.schema.js';

export type { ProvisionTenant };
// MOD-08: input schemas and module types in a single place.
export { provisionTenantSchema };

export const tenantIdParamSchema = z.object({ id: idSchema }).strict();

export type PlatformRouterDeps = InviteRouterDeps;
