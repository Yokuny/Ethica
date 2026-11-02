import { useQuery } from '@tanstack/react-query';
import { AppLink } from '@/components/app-link.js';
import { CourtDivisionContacts } from '@/components/court-division-contacts.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseRecord } from '@/query/case.js';
import { courtDivisionsQuery } from '@/query/court-division.js';

const normalize = (text: string) =>
  ` ${text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()}`;

// VAR-03: contact of the case division when the district is a registered city and the registered name
// contains the case division ("1ª Vara do Trabalho" finds "1ª Vara do Trabalho de Campinas", not the 11ª).
export function CaseCourtDivision({ legalCase }: { legalCase: CaseRecord }) {
  const { division, district } = legalCase;
  const query = useQuery({ ...courtDivisionsQuery({ city: district }), enabled: Boolean(division && district) });
  const found = division && query.data?.find((item) => normalize(item.name).includes(normalize(division)));
  if (!found) return null;

  return (
    <Panel
      size="sm"
      title={t('court_division_contact')}
      description={`${found.name} · ${found.city}/${found.state}`}
      actions={
        <AppLink to="/court-divisions" search={{ state: found.state, city: found.city }}>
          {t('court_divisions')}
        </AppLink>
      }
    >
      <CourtDivisionContacts division={found} />
    </Panel>
  );
}
