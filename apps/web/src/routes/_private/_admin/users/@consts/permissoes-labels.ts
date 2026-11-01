import type { PermissaoAcao, PermissaoModulo } from '@ethica/contracts';

// Chaves de tradução da matriz (AD-137): literais, para o dicionário conferir cada uma.
export const PERMISSAO_MODULO_KEY: Record<PermissaoModulo, string> = {
  expert_cases: 'expert_cases',
  parties: 'parties',
  agenda: 'agenda',
  expert_reports: 'reports_and_opinions',
  report_templates: 'report_templates',
  finance: 'finance',
  prospecting: 'prospecting',
  reports: 'reports',
};

export const PERMISSAO_ACAO_KEY: Record<PermissaoAcao, string> = {
  view: 'permission_view',
  create: 'permission_create',
  update: 'permission_update',
  delete: 'permission_delete',
};
