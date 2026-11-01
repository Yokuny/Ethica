import { describe, expect, it } from 'vitest';
import {
  PERFIL_PERMISSOES,
  PERMISSAO_MODULOS,
  permissoesEfetivas,
  permissoesSchema,
  pode,
  TODAS_PERMISSOES,
} from './permissao.schema.js';

describe('matriz de permissões (AD-137)', () => {
  it('admin tem tudo, mesmo com matriz gravada', () => {
    expect(permissoesEfetivas(['admin'], { expert_cases: ['view'] })).toEqual(TODAS_PERMISSOES);
    for (const modulo of PERMISSAO_MODULOS) expect(pode(TODAS_PERMISSOES, modulo, 'delete')).toBe(true);
  });

  it('membro sem matriz gravada usa o preset do papel', () => {
    expect(permissoesEfetivas(['operator'])).toEqual(PERFIL_PERMISSOES.operator);
    expect(permissoesEfetivas(['manager'])).toEqual(PERFIL_PERMISSOES.manager);
    expect(permissoesEfetivas([])).toEqual({});
  });

  it('a matriz gravada vence o preset', () => {
    const permissoes = permissoesEfetivas(['operator'], { finance: ['view'] });
    expect(pode(permissoes, 'finance', 'view')).toBe(true);
    expect(pode(permissoes, 'expert_cases', 'view')).toBe(false);
  });

  it('presets reproduzem os papéis da AD-107', () => {
    expect(pode(PERFIL_PERMISSOES.operator, 'finance', 'view')).toBe(false);
    expect(pode(PERFIL_PERMISSOES.operator, 'report_templates', 'create')).toBe(false);
    expect(pode(PERFIL_PERMISSOES.operator, 'expert_cases', 'delete')).toBe(false);
    expect(pode(PERFIL_PERMISSOES.manager, 'finance', 'update')).toBe(true);
    expect(pode(PERFIL_PERMISSOES.manager, 'expert_cases', 'delete')).toBe(false);
  });

  it('recusa ação sem ver, ação repetida e módulo desconhecido', () => {
    expect(permissoesSchema.safeParse({ expert_cases: ['create'] }).success).toBe(false);
    expect(permissoesSchema.safeParse({ expert_cases: ['view', 'view'] }).success).toBe(false);
    expect(permissoesSchema.safeParse({ users: ['view'] }).success).toBe(false);
    expect(permissoesSchema.safeParse({ expert_cases: ['view', 'update'], agenda: [] }).success).toBe(true);
  });
});
