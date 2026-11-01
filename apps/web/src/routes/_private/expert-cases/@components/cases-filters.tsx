import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { CASE_PHASE_ITEMS, CASE_STATE_ITEMS, CASE_STATUS_ITEMS, COURT_TYPE_ITEMS } from '@/components/case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CasesSearch } from '../@interface/cases.interface.js';

const ALL = '__all__';

function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const withAll = [{ value: ALL, label: t('all') }, ...items];
  return (
    <div className="grid gap-1.5">
      <ItemDescription>{label}</ItemDescription>
      <Select
        items={withAll}
        value={value ?? ALL}
        onValueChange={(next) => onChange(!next || next === ALL ? undefined : next)}
      >
        <SelectTrigger className="w-full">
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

// Conteúdo do popover "Filtros" da listagem: situação, etapa, fase (AD-133) e justiça.
export function CasesFilters({
  search,
  onChange,
}: {
  search: CasesSearch;
  onChange: (patch: Partial<CasesSearch>) => void;
}) {
  return (
    <>
      <FilterSelect
        label={t('situation')}
        items={CASE_STATE_ITEMS}
        value={search.state}
        onChange={(state) => onChange({ state: state as CasesSearch['state'], page: 1 })}
      />
      <FilterSelect
        label={t('stage')}
        items={CASE_STATUS_ITEMS}
        value={search.status}
        onChange={(status) => onChange({ status: status as CasesSearch['status'], page: 1 })}
      />
      <FilterSelect
        label={t('phase')}
        items={CASE_PHASE_ITEMS}
        value={search.phase}
        onChange={(phase) => onChange({ phase: phase as CasesSearch['phase'], page: 1 })}
      />
      <FilterSelect
        label={t('court_type')}
        items={COURT_TYPE_ITEMS}
        value={search.courtType}
        onChange={(courtType) => onChange({ courtType: courtType as CasesSearch['courtType'], page: 1 })}
      />
    </>
  );
}
