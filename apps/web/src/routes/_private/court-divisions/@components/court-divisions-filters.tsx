import { BRAZILIAN_STATES } from '@ethica/contracts';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { COURT_TYPE_ITEMS } from '@/components/case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { courtDivisionCitiesQuery } from '@/query/court-division.js';
import type { CourtDivisionsSearch } from '../@interface/court-divisions.interface.js';

const ALL = '__all__';

function FilterSelect({
  label,
  items,
  value,
  disabled,
  onChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  value?: string;
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  const withAll = [{ value: ALL, label: t('all') }, ...items];
  return (
    <div className="grid gap-1.5">
      <ItemDescription>{label}</ItemDescription>
      <Select
        items={withAll}
        value={value ?? ALL}
        disabled={disabled}
        onValueChange={(next) => onChange(!next || next === ALL ? undefined : next)}
      >
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {withAll.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// State → city (only the registered ones) → court type (VAR-01).
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
    <div className="grid gap-4 sm:grid-cols-3">
      <FilterSelect
        label={t('state')}
        items={BRAZILIAN_STATES.map((value) => ({ value, label: value }))}
        value={search.state}
        onChange={(state) => onChange({ state: state as CourtDivisionsSearch['state'], city: undefined })}
      />
      <FilterSelect
        label={t('city')}
        items={(cities.data ?? []).map((city) => ({ value: city, label: city }))}
        value={search.city}
        disabled={!search.state}
        onChange={(city) => onChange({ city })}
      />
      <FilterSelect
        label={t('court_type')}
        items={COURT_TYPE_ITEMS}
        value={search.courtType}
        onChange={(courtType) => onChange({ courtType: courtType as CourtDivisionsSearch['courtType'] })}
      />
    </div>
  );
}
