import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { JUSTICA_ITEMS, PERICIA_STATUS_ITEMS } from '@/components/pericia-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiasSearch } from '../@interface/pericias.interface.js';

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

// Conteúdo do popover "Filtros" da listagem: etapa e justiça.
export function PericiasFilters({
  search,
  onChange,
}: {
  search: PericiasSearch;
  onChange: (patch: Partial<PericiasSearch>) => void;
}) {
  return (
    <>
      <FilterSelect
        label={t('stage')}
        items={PERICIA_STATUS_ITEMS}
        value={search.status}
        onChange={(status) => onChange({ status: status as PericiasSearch['status'], page: 1 })}
      />
      <FilterSelect
        label={t('court_type')}
        items={JUSTICA_ITEMS}
        value={search.justica}
        onChange={(justica) => onChange({ justica: justica as PericiasSearch['justica'], page: 1 })}
      />
    </>
  );
}
