import type { PermissionModule } from '@ethica/contracts';
import { can, isAdminSession, type SessionView } from '@/query/session.js';
import type { HomeSection } from '../@interface/home.interface.js';

// Same rule as the API routers: module by the matrix (AD-137), users and office admin only.
export function canAccessHomeSection(section: HomeSection, session: SessionView): boolean {
  if (section.access === 'admin') return isAdminSession(session);
  return can(session, section.access);
}

// First URL segment → matrix module; `undefined` = screen without a module (home, account, admin).
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
  const [first, second] = pathname.split('/').filter(Boolean);
  if (first === 'expert-reports' && second === 'templates') return 'report_templates';
  return first ? MODULE_BY_SEGMENT[first] : undefined;
}
