import type { DiarioAcao, DiarioModulo } from '@ethica/contracts';

// Chaves de tradução do diário de bordo (AD-134): literais, para o dicionário conferir cada uma.
export const DIARIO_MODULO_KEY: Record<DiarioModulo, string> = {
  pericias: 'expert_cases',
  partes: 'parties',
  agenda: 'agenda',
  laudos: 'reports_and_opinions',
  modelos: 'report_templates',
  financeiro: 'finance',
  prospeccao: 'prospecting',
  escritorio: 'office',
  usuarios: 'users',
  conta: 'my_account',
};

export const DIARIO_ACAO_KEY: Record<DiarioAcao, string> = {
  create: 'activity_created',
  update: 'activity_updated',
  delete: 'activity_deleted',
  complete: 'activity_completed',
  convert: 'activity_converted',
  import: 'activity_imported',
  export: 'activity_exported',
  notify: 'activity_notified',
  signin: 'activity_signed_in',
};

// Sub-registro que vale nomear na ação (prazo, parcela…); o resto fica só no módulo.
export const DIARIO_RECURSO_KEY: Record<string, string> = {
  prazos: 'deadline',
  movimentacoes: 'case_movement',
  parcelas: 'installment',
  secoes: 'section',
  midias: 'media',
  permissoes: 'permissions',
  logo: 'logo',
  csv: 'spreadsheet',
  pdf: 'pdf_file',
};
