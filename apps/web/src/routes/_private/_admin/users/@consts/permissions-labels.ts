import type { PermissionAction, PermissionModule } from '@ethica/contracts';

// Matrix translation keys (AD-137): literals, so the dictionary checks each one.
export const PERMISSION_MODULE_KEY: Record<PermissionModule, string> = {
  expert_cases: 'expert_cases',
  parties: 'parties',
  agenda: 'agenda',
  expert_reports: 'reports_and_opinions',
  report_templates: 'report_templates',
  finance: 'finance',
  prospecting: 'prospecting',
  reports: 'reports',
};

export const PERMISSION_ACTION_KEY: Record<PermissionAction, string> = {
  view: 'permission_view',
  create: 'permission_create',
  update: 'permission_update',
  delete: 'permission_delete',
};
