import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  effectivePermissions,
  PERMISSION_MODULES,
  PROFILE_PERMISSIONS,
  permissionsSchema,
  pode,
} from './permission.schema.js';

describe('matriz de permissões (AD-137)', () => {
  it('admin tem tudo, mesmo com matriz gravada', () => {
    expect(effectivePermissions(['admin'], { expert_cases: ['view'] })).toEqual(ALL_PERMISSIONS);
    for (const module of PERMISSION_MODULES) expect(pode(ALL_PERMISSIONS, module, 'delete')).toBe(true);
  });

  it('membro sem matriz gravada usa o preset do papel', () => {
    expect(effectivePermissions(['operator'])).toEqual(PROFILE_PERMISSIONS.operator);
    expect(effectivePermissions(['manager'])).toEqual(PROFILE_PERMISSIONS.manager);
    expect(effectivePermissions([])).toEqual({});
  });

  it('a matriz gravada vence o preset', () => {
    const permissions = effectivePermissions(['operator'], { finance: ['view'] });
    expect(pode(permissions, 'finance', 'view')).toBe(true);
    expect(pode(permissions, 'expert_cases', 'view')).toBe(false);
  });

  it('presets reproduzem os papéis da AD-107', () => {
    expect(pode(PROFILE_PERMISSIONS.operator, 'finance', 'view')).toBe(false);
    expect(pode(PROFILE_PERMISSIONS.operator, 'report_templates', 'create')).toBe(false);
    expect(pode(PROFILE_PERMISSIONS.operator, 'expert_cases', 'delete')).toBe(false);
    expect(pode(PROFILE_PERMISSIONS.manager, 'finance', 'update')).toBe(true);
    expect(pode(PROFILE_PERMISSIONS.manager, 'expert_cases', 'delete')).toBe(false);
  });

  it('recusa ação sem ver, ação repetida e módulo desconhecido', () => {
    expect(permissionsSchema.safeParse({ expert_cases: ['create'] }).success).toBe(false);
    expect(permissionsSchema.safeParse({ expert_cases: ['view', 'view'] }).success).toBe(false);
    expect(permissionsSchema.safeParse({ users: ['view'] }).success).toBe(false);
    expect(permissionsSchema.safeParse({ expert_cases: ['view', 'update'], agenda: [] }).success).toBe(true);
  });
});
