import type { Permissions, SignIn, TenantUser, UpdatePermissions } from '@ethica/contracts';
import { idSchema, signinSchema, updatePermissionsSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { Permissions, SignIn, TenantUser, UpdatePermissions };
// MOD-08: input schemas and module types in a single place.
export { signinSchema, updatePermissionsSchema };

// Tenant directory. `active=true` returns only who can get new work
// (assignee selector); without it the list also brings the inactive ones, which still
// show up in filters of old data.
export const listUsersQuerySchema = z.object({ active: z.enum(['true', 'false']).optional() }).strict();
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// REG-07 (AD-071): full directory, admin only — no parameters.
export const userDirectoryQuerySchema = z.object({}).strict();

// ACC-06: photo of a user from the session tenant.
export const userIdParamSchema = z.object({ id: idSchema }).strict();

export type AuthRouterDeps = { validToken: RequestHandler };

export type UserForSignin = {
  id: string;
  tenant?: string;
  password: string;
  active: boolean;
};

// `avatar`: versioned photo path (ACC-06), missing without a photo.
export type UserView = { id: string; name: string; email: string; avatar?: string };

export type TenantView = { id: string; name: string; status: string };

export type SessionView = {
  tenant?: { id: string; name: string; status: string };
  user: UserView;
  role: TenantUser['role'];
  // Effective matrix (AD-137): the web hides what the API will reject.
  permissions: Permissions;
};

// MOD-07: batch read for other modules (order, conversation, card)
// to resolve a user name (e.g. who approved/rejected an Order) without a
// segunda consulta por item.
export type UserNameSummary = { id: string; name: string };

// Directory for selectors and to find the assignee photo on the front (ACC-06).
export type UserSummary = UserNameSummary & { avatar?: string };

export type UserAvatarImage = { contentType: string; data: Buffer };

// REG-07 (AD-071): row of the user directory of the admin screen. Never
// carries a password or session data.
export type UserDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: TenantUser['role'];
  // Effective matrix (AD-137): admin with everything, member with the saved one or the profile preset.
  permissions: Permissions;
  active: boolean;
  // ISO 8601 (UTC): when the person joined the team.
  createdAt: string;
  avatar?: string;
};
