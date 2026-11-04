import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import {
  CASE_PHASE_ITEMS,
  CASE_STATUS_ITEMS,
  COURT_TYPE_ITEMS,
  OWN_TYPE_PREFIX,
  serviceTypeItems,
} from '@/components/case-labels.js';
import { DatePicker } from '@/components/date-picker.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
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

// Listing "Filtros" popover content: phase and status (AD-178), sphere, type (AD-177) and delivery period.
export function CasesFilters({
  search,
  onChange,
}: {
  search: CasesSearch;
  onChange: (patch: Partial<CasesSearch>) => void;
}) {
  const officeTypes = useQuery(serviceTypesQuery);
  const type = search.serviceType ? `${OWN_TYPE_PREFIX}${search.serviceType}` : search.role;
  const chooseType = (value: string | undefined) =>
    onChange({
      role: value && !value.startsWith(OWN_TYPE_PREFIX) ? (value as CasesSearch['role']) : undefined,
      serviceType: value?.startsWith(OWN_TYPE_PREFIX) ? value.slice(OWN_TYPE_PREFIX.length) : undefined,
      page: 1,
    });
  return (
    <>
      <FilterSelect
        label={t('service_phase')}
        items={CASE_PHASE_ITEMS}
        value={search.phase}
        onChange={(phase) => onChange({ phase: phase as CasesSearch['phase'], page: 1 })}
      />
      <FilterSelect
        label={t('status')}
        items={CASE_STATUS_ITEMS}
        value={search.status}
        onChange={(status) => onChange({ status: status as CasesSearch['status'], page: 1 })}
      />
      <FilterSelect
        label={t('sphere')}
        items={COURT_TYPE_ITEMS}
        value={search.courtType}
        onChange={(courtType) => onChange({ courtType: courtType as CasesSearch['courtType'], page: 1 })}
      />
      <FilterSelect
        label={t('service_type')}
        items={serviceTypeItems(officeTypes.data ?? [])}
        value={type}
        onChange={chooseType}
      />
      <div className="grid gap-1.5">
        <ItemDescription>{t('delivery_period')}</ItemDescription>
        <div className="grid grid-cols-2 gap-2">
          <DatePicker
            value={search.deliveryFrom}
            placeholder={t('from')}
            onChange={(deliveryFrom) => onChange({ deliveryFrom, page: 1 })}
          />
          <DatePicker
            value={search.deliveryTo}
            placeholder={t('to')}
            onChange={(deliveryTo) => onChange({ deliveryTo, page: 1 })}
          />
        </div>
        <ItemDescription className="line-clamp-none text-xs">{t('delivery_period_note')}</ItemDescription>
      </div>
    </>
  );
}
