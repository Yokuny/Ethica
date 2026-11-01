import type { Permissions } from './schemas/permission.schema.js';

export type Role = 'admin' | 'manager' | 'operator';

export type TenantUser = {
  tenant?: string;
  user: string;
  role: Role[];
  isPlatformAdmin: boolean;
  // Effective matrix (AD-137), resolved from the database on every request.
  permissions: Permissions;
};
