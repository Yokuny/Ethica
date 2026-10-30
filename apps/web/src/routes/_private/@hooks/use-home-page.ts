import { useSuspenseQuery } from '@tanstack/react-query';
import { sessionQuery } from '@/query/session.js';
import { HOME_SECTIONS } from '../@consts/home-sections.js';
import { canAccessHomeSection } from '../@utils/home-access.js';

export function useHomePage() {
  const { data } = useSuspenseQuery(sessionQuery);

  return {
    session: data,
    canSeeFinance: data.role.some((role) => role === 'admin' || role === 'manager'),
    sections: HOME_SECTIONS.filter((section) => canAccessHomeSection(section, data)),
  };
}
