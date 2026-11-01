import type { PermissaoModulo } from '@ethica/contracts';
import { can, isAdminSession, type SessionView } from '@/query/session.js';
import type { HomeSection } from '../@interface/home.interface.js';

// Mesma regra dos routers da API: módulo pela matriz (AD-137), usuários e escritório só admin.
export function canAccessHomeSection(section: HomeSection, session: SessionView): boolean {
  if (section.access === 'admin') return isAdminSession(session);
  return can(session, section.access);
}

// Primeiro segmento da URL → módulo da matriz; `undefined` = tela sem módulo (início, conta, admin).
const MODULO_POR_SEGMENTO: Record<string, PermissaoModulo> = {
  pericias: 'pericias',
  partes: 'partes',
  agenda: 'agenda',
  campo: 'agenda',
  laudos: 'laudos',
  financeiro: 'financeiro',
  prospeccao: 'prospeccao',
  relatorios: 'relatorios',
};

export function moduloDaRota(pathname: string): PermissaoModulo | undefined {
  const [primeiro, segundo] = pathname.split('/').filter(Boolean);
  if (primeiro === 'laudos' && segundo === 'modelos') return 'modelos';
  return primeiro ? MODULO_POR_SEGMENTO[primeiro] : undefined;
}
