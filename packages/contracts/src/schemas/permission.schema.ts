import { z } from 'zod';
import type { Role } from '../types.js';

// Per-member permission matrix (AD-137): module → actions. The admin has everything and is the only one
// who manages users, office, activity log and permissions — those areas stay outside the matrix.
export const PERMISSION_MODULES = [
  'expert_cases',
  'parties',
  'agenda',
  'expert_reports',
  'report_templates',
  'finance',
  'prospecting',
  'reports',
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

// Accessing and viewing are a single action: without `view` the module disappears from the menu.
export const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type Permissions = Partial<Record<PermissionModule, PermissionAction[]>>;

const actionsSchema = z
  .array(z.enum(PERMISSION_ACTIONS))
  .max(PERMISSION_ACTIONS.length)
  .refine((actions) => new Set(actions).size === actions.length, 'ação repetida')
  .refine((actions) => !actions.length || actions.includes('view'), 'inserir, editar e excluir exigem ver');

export const permissionsSchema = z
  .object(
    Object.fromEntries(PERMISSION_MODULES.map((module) => [module, actionsSchema.optional()])) as {
      [K in PermissionModule]: z.ZodOptional<typeof actionsSchema>;
    },
  )
  .strict();

export const updatePermissionsSchema = z.object({ permissions: permissionsSchema }).strict();
export type UpdatePermissions = z.infer<typeof updatePermissionsSchema>;

const TUDO: PermissionAction[] = ['view', 'create', 'update', 'delete'];
const WITHOUT_DELETE: PermissionAction[] = ['view', 'create', 'update'];

export const ALL_PERMISSIONS: Permissions = Object.fromEntries(PERMISSION_MODULES.map((module) => [module, TUDO]));

// Profile presets, the same as the fixed roles of AD-107: manager with everything except deleting
// a case; operator without finance, without deleting a case and only reading report templates.
export const PROFILE_PERMISSIONS: Record<Exclude<Role, 'admin'>, Permissions> = {
  manager: { ...ALL_PERMISSIONS, expert_cases: WITHOUT_DELETE },
  operator: {
    expert_cases: WITHOUT_DELETE,
    parties: WITHOUT_DELETE,
    agenda: TUDO,
    expert_reports: TUDO,
    report_templates: ['view'],
    prospecting: TUDO,
    reports: ['view'],
  },
};

// Admin has everything; the others use the saved matrix or, without it, the role preset.
export const effectivePermissions = (role: Role[], permissions?: Permissions): Permissions => {
  if (role.includes('admin')) return ALL_PERMISSIONS;
  if (permissions) return permissions;
  if (role.includes('manager')) return PROFILE_PERMISSIONS.manager;
  if (role.includes('operator')) return PROFILE_PERMISSIONS.operator;
  return {};
};

export const hasPermission = (permissions: Permissions, module: PermissionModule, action: PermissionAction): boolean =>
  permissions[module]?.includes(action) === true;
