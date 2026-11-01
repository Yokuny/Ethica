import { useSuspenseQuery } from '@tanstack/react-query';
import { can, sessionQuery } from '@/query/session.js';
import { HOME_SECTIONS } from '../@consts/home-sections.js';
import { canAccessHomeSection } from '../@utils/home-access.js';

export function useHomePage() {
  const { data } = useSuspenseQuery(sessionQuery);

  return {
    session: data,
    canSeeFinance: can(data, 'finance'),
    sections: HOME_SECTIONS.filter((section) => canAccessHomeSection(section, data)),
  };
}
