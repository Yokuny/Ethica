import { BRAZILIAN_STATES } from '@ethica/contracts';
import { useQuery } from '@tanstack/react-query';
import { COURT_TYPE_ITEMS } from '@/components/case-labels.js';
import type { TableFilterItem } from '@/components/data-table.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { courtDivisionCitiesQuery } from '@/query/court-division.js';
import type { CourtDivisionsSearch } from '../@interface/court-divisions.interface.js';

// "Filtros" of the court divisions (AD-193, FIL-01): states → cities registered in them → court type, several
// values each (FIL-03).
export function useCourtDivisionsFilters(
  search: CourtDivisionsSearch,
  onChange: (patch: Partial<CourtDivisionsSearch>) => void,
): TableFilterItem[] {
  const cities = useQuery({ ...courtDivisionCitiesQuery(search.state ?? []), enabled: Boolean(search.state) });
  return [
    {
      label: t('state'),
      items: BRAZILIAN_STATES.map((value) => ({ value, label: value })),
      value: search.state,
      onChange: (state) => onChange({ state: state as CourtDivisionsSearch['state'], city: undefined }),
    },
    {
      label: t('city'),
      items: (cities.data ?? []).map((city) => ({ value: city, label: city })),
      value: search.city,
      disabled: !search.state,
      onChange: (city) => onChange({ city }),
    },
    {
      label: t('court_type'),
      items: COURT_TYPE_ITEMS,
      value: search.courtType,
      onChange: (courtType) => onChange({ courtType: courtType as CourtDivisionsSearch['courtType'] }),
    },
  ];
}
