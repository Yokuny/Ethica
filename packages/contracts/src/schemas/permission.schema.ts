import { z } from 'zod';
import type { Role } from '../types.js';

// Matriz de permissões por membro (AD-137): módulo → ações. O admin tem tudo e é o único
// que gerencia usuários, escritório, diário e permissões — essas áreas ficam fora da matriz.
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

// Acessar e visualizar são uma só ação: sem `view` o módulo some do menu.
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

// Presets dos perfis, iguais aos papéis fixos da AD-107: gestor com tudo menos excluir
// perícia; operador sem financeiro, sem excluir perícia e só lendo os modelos de laudo.
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

// Admin tem tudo; os outros usam a matriz gravada ou, sem ela, o preset do papel.
export const effectivePermissions = (role: Role[], permissions?: Permissions): Permissions => {
  if (role.includes('admin')) return ALL_PERMISSIONS;
  if (permissions) return permissions;
  if (role.includes('manager')) return PROFILE_PERMISSIONS.manager;
  if (role.includes('operator')) return PROFILE_PERMISSIONS.operator;
  return {};
};

export const hasPermission = (permissions: Permissions, module: PermissionModule, action: PermissionAction): boolean =>
  permissions[module]?.includes(action) === true;
