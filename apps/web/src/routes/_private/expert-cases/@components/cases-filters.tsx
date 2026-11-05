import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import {
  CASE_PHASE_ITEMS,
  CASE_STATUS_ITEMS,
  COURT_TYPE_ITEMS,
  OWN_TYPE_PREFIX,
  serviceTypeItems,
} from '@/components/case-labels.js';
import { TableFilterSelect } from '@/components/data-table.js';
import { DatePicker } from '@/components/date-picker.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { CasesSearch } from '../@interface/cases.interface.js';

// Listing "Filtros" popover content: control number (OS), phase and status (AD-178), sphere, type (AD-177) and delivery period.
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
  const [serviceOrder, handleServiceOrder] = useDebouncedSearch(search.serviceOrder ?? '', (value) =>
    onChange({ serviceOrder: value.trim() || undefined, page: 1 }),
  );
  return (
    <>
      <div className="grid gap-1.5">
        <ItemDescription>{t('control_number')}</ItemDescription>
        <Input value={serviceOrder} onChange={(event) => handleServiceOrder(event.target.value)} />
      </div>
      <TableFilterSelect
        label={t('service_phase')}
        items={CASE_PHASE_ITEMS}
        value={search.phase}
        onChange={(phase) => onChange({ phase: phase as CasesSearch['phase'], page: 1 })}
      />
      <TableFilterSelect
        label={t('status')}
        items={CASE_STATUS_ITEMS}
        value={search.status}
        onChange={(status) => onChange({ status: status as CasesSearch['status'], page: 1 })}
      />
      <TableFilterSelect
        label={t('sphere')}
        items={COURT_TYPE_ITEMS}
        value={search.courtType}
        onChange={(courtType) => onChange({ courtType: courtType as CasesSearch['courtType'], page: 1 })}
      />
      <TableFilterSelect
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
