import { z } from 'zod';
import type { Role } from '../types.js';

// Matriz de permissões por membro (AD-137): módulo → ações. O admin tem tudo e é o único
// que gerencia usuários, escritório, diário e permissões — essas áreas ficam fora da matriz.
export const PERMISSAO_MODULOS = [
  'expert_cases',
  'parties',
  'agenda',
  'expert_reports',
  'report_templates',
  'finance',
  'prospecting',
  'reports',
] as const;
export type PermissaoModulo = (typeof PERMISSAO_MODULOS)[number];

// Acessar e visualizar são uma só ação: sem `view` o módulo some do menu.
export const PERMISSAO_ACOES = ['view', 'create', 'update', 'delete'] as const;
export type PermissaoAcao = (typeof PERMISSAO_ACOES)[number];

export type Permissoes = Partial<Record<PermissaoModulo, PermissaoAcao[]>>;

const acoesSchema = z
  .array(z.enum(PERMISSAO_ACOES))
  .max(PERMISSAO_ACOES.length)
  .refine((acoes) => new Set(acoes).size === acoes.length, 'ação repetida')
  .refine((acoes) => !acoes.length || acoes.includes('view'), 'inserir, editar e excluir exigem ver');

export const permissoesSchema = z
  .object(
    Object.fromEntries(PERMISSAO_MODULOS.map((modulo) => [modulo, acoesSchema.optional()])) as {
      [K in PermissaoModulo]: z.ZodOptional<typeof acoesSchema>;
    },
  )
  .strict();

export const updatePermissoesSchema = z.object({ permissoes: permissoesSchema }).strict();
export type UpdatePermissoes = z.infer<typeof updatePermissoesSchema>;

const TUDO: PermissaoAcao[] = ['view', 'create', 'update', 'delete'];
const SEM_EXCLUIR: PermissaoAcao[] = ['view', 'create', 'update'];

export const TODAS_PERMISSOES: Permissoes = Object.fromEntries(PERMISSAO_MODULOS.map((modulo) => [modulo, TUDO]));

// Presets dos perfis, iguais aos papéis fixos da AD-107: gestor com tudo menos excluir
// perícia; operador sem financeiro, sem excluir perícia e só lendo os modelos de laudo.
export const PERFIL_PERMISSOES: Record<Exclude<Role, 'admin'>, Permissoes> = {
  manager: { ...TODAS_PERMISSOES, expert_cases: SEM_EXCLUIR },
  operator: {
    expert_cases: SEM_EXCLUIR,
    parties: SEM_EXCLUIR,
    agenda: TUDO,
    expert_reports: TUDO,
    report_templates: ['view'],
    prospecting: TUDO,
    reports: ['view'],
  },
};

// Admin tem tudo; os outros usam a matriz gravada ou, sem ela, o preset do papel.
export const permissoesEfetivas = (role: Role[], permissoes?: Permissoes): Permissoes => {
  if (role.includes('admin')) return TODAS_PERMISSOES;
  if (permissoes) return permissoes;
  if (role.includes('manager')) return PERFIL_PERMISSOES.manager;
  if (role.includes('operator')) return PERFIL_PERMISSOES.operator;
  return {};
};

export const pode = (permissoes: Permissoes, modulo: PermissaoModulo, acao: PermissaoAcao): boolean =>
  permissoes[modulo]?.includes(acao) === true;
