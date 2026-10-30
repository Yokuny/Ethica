import { isAdminSession, type SessionView } from '@/query/session.js';
import type { HomeSection } from '../@interface/home.interface.js';

// Mesmos papéis dos routers da API: financeiro é admin/manager, usuários só admin.
export function canAccessHomeSection(section: HomeSection, session: SessionView): boolean {
  if (section.access === 'admin') return isAdminSession(session);
  if (section.access === 'finance') return session.role.some((role) => role === 'admin' || role === 'manager');
  return true;
}
