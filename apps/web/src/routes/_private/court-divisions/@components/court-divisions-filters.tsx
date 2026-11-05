import { BRAZILIAN_STATES } from '@ethica/contracts';
import { useQuery } from '@tanstack/react-query';
import { COURT_TYPE_ITEMS } from '@/components/case-labels.js';
import { TableFilterSelect } from '@/components/data-table.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { courtDivisionCitiesQuery } from '@/query/court-division.js';
import type { CourtDivisionsSearch } from '../@interface/court-divisions.interface.js';

// "Filtros" popover content (AD-193): state → city (only the registered ones) → court type (VAR-01).
export function CourtDivisionsFilters({
  search,
  onChange,
}: {
  search: CourtDivisionsSearch;
  onChange: (patch: Partial<CourtDivisionsSearch>) => void;
}) {
  const cities = useQuery({
    ...courtDivisionCitiesQuery(search.state ?? 'SP'),
    enabled: Boolean(search.state),
  });
  return (
    <>
      <TableFilterSelect
        label={t('state')}
        items={BRAZILIAN_STATES.map((value) => ({ value, label: value }))}
        value={search.state}
        onChange={(state) => onChange({ state: state as CourtDivisionsSearch['state'], city: undefined })}
      />
      <TableFilterSelect
        label={t('city')}
        items={(cities.data ?? []).map((city) => ({ value: city, label: city }))}
        value={search.city}
        disabled={!search.state}
        onChange={(city) => onChange({ city })}
      />
      <TableFilterSelect
        label={t('court_type')}
        items={COURT_TYPE_ITEMS}
        value={search.courtType}
        onChange={(courtType) => onChange({ courtType: courtType as CourtDivisionsSearch['courtType'] })}
      />
    </>
  );
}
