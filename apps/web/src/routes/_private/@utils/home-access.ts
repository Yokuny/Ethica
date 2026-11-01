import type { PermissionModule } from '@ethica/contracts';
import { can, isAdminSession, type SessionView } from '@/query/session.js';
import type { HomeSection } from '../@interface/home.interface.js';

// Mesma regra dos routers da API: módulo pela matriz (AD-137), usuários e escritório só admin.
export function canAccessHomeSection(section: HomeSection, session: SessionView): boolean {
  if (section.access === 'admin') return isAdminSession(session);
  return can(session, section.access);
}

// Primeiro segmento da URL → módulo da matriz; `undefined` = tela sem módulo (início, conta, admin).
const MODULE_BY_SEGMENT: Record<string, PermissionModule> = {
  'expert-cases': 'expert_cases',
  parties: 'parties',
  agenda: 'agenda',
  field: 'agenda',
  'expert-reports': 'expert_reports',
  finance: 'finance',
  prospecting: 'prospecting',
  reports: 'reports',
};

export function moduleFromRoute(pathname: string): PermissionModule | undefined {
  const [primeiro, segundo] = pathname.split('/').filter(Boolean);
  if (primeiro === 'expert-reports' && segundo === 'templates') return 'report_templates';
  return primeiro ? MODULE_BY_SEGMENT[primeiro] : undefined;
}
