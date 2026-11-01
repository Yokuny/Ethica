import type { ActivityLogAction, ActivityLogModule } from '@ethica/contracts';

// Chaves de tradução do diário de bordo (AD-134): literais, para o dicionário conferir cada uma.
export const ACTIVITY_LOG_MODULE_KEY: Record<ActivityLogModule, string> = {
  expert_cases: 'expert_cases',
  parties: 'parties',
  agenda: 'agenda',
  expert_reports: 'reports_and_opinions',
  report_templates: 'report_templates',
  finance: 'finance',
  prospecting: 'prospecting',
  office: 'office',
  users: 'users',
  account: 'my_account',
};

export const ACTIVITY_LOG_ACTION_KEY: Record<ActivityLogAction, string> = {
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
export const ACTIVITY_LOG_RESOURCE_KEY: Record<string, string> = {
  deadlines: 'deadline',
  movements: 'case_movement',
  installments: 'installment',
  sections: 'section',
  media: 'media',
  permissions: 'permissions',
  logo: 'logo',
  csv: 'spreadsheet',
  pdf: 'pdf_file',
};
