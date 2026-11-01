import type { PermissaoAcao, PermissaoModulo } from '@ethica/contracts';

// Chaves de tradução da matriz (AD-137): literais, para o dicionário conferir cada uma.
export const PERMISSAO_MODULO_KEY: Record<PermissaoModulo, string> = {
  pericias: 'expert_cases',
  partes: 'parties',
  agenda: 'agenda',
  laudos: 'reports_and_opinions',
  modelos: 'report_templates',
  financeiro: 'finance',
  prospeccao: 'prospecting',
  relatorios: 'reports',
};

export const PERMISSAO_ACAO_KEY: Record<PermissaoAcao, string> = {
  view: 'permission_view',
  create: 'permission_create',
  update: 'permission_update',
  delete: 'permission_delete',
};
