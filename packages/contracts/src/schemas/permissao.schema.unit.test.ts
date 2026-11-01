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
    expect(permissoesEfetivas(['admin'], { pericias: ['view'] })).toEqual(TODAS_PERMISSOES);
    for (const modulo of PERMISSAO_MODULOS) expect(pode(TODAS_PERMISSOES, modulo, 'delete')).toBe(true);
  });

  it('membro sem matriz gravada usa o preset do papel', () => {
    expect(permissoesEfetivas(['operator'])).toEqual(PERFIL_PERMISSOES.operator);
    expect(permissoesEfetivas(['manager'])).toEqual(PERFIL_PERMISSOES.manager);
    expect(permissoesEfetivas([])).toEqual({});
  });

  it('a matriz gravada vence o preset', () => {
    const permissoes = permissoesEfetivas(['operator'], { financeiro: ['view'] });
    expect(pode(permissoes, 'financeiro', 'view')).toBe(true);
    expect(pode(permissoes, 'pericias', 'view')).toBe(false);
  });

  it('presets reproduzem os papéis da AD-107', () => {
    expect(pode(PERFIL_PERMISSOES.operator, 'financeiro', 'view')).toBe(false);
    expect(pode(PERFIL_PERMISSOES.operator, 'modelos', 'create')).toBe(false);
    expect(pode(PERFIL_PERMISSOES.operator, 'pericias', 'delete')).toBe(false);
    expect(pode(PERFIL_PERMISSOES.manager, 'financeiro', 'update')).toBe(true);
    expect(pode(PERFIL_PERMISSOES.manager, 'pericias', 'delete')).toBe(false);
  });

  it('recusa ação sem ver, ação repetida e módulo desconhecido', () => {
    expect(permissoesSchema.safeParse({ pericias: ['create'] }).success).toBe(false);
    expect(permissoesSchema.safeParse({ pericias: ['view', 'view'] }).success).toBe(false);
    expect(permissoesSchema.safeParse({ usuarios: ['view'] }).success).toBe(false);
    expect(permissoesSchema.safeParse({ pericias: ['view', 'update'], agenda: [] }).success).toBe(true);
  });
});
