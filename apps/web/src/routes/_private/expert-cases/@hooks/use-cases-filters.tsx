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
import { periodSummary, type TableFilterItem } from '@/components/data-table.js';
import { DatePicker } from '@/components/date-picker.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { CasesSearch } from '../@interface/cases.interface.js';

type Patch = (patch: Partial<CasesSearch>) => void;

function ServiceOrderField({ value, onChange }: { value?: string; onChange: Patch }) {
  const [serviceOrder, handleServiceOrder] = useDebouncedSearch(value ?? '', (next) =>
    onChange({ serviceOrder: next.trim() || undefined, page: 1 }),
  );
  return (
    <Input
      autoFocus
      aria-label={t('control_number')}
      value={serviceOrder}
      onChange={(event) => handleServiceOrder(event.target.value)}
    />
  );
}

// "Filtros" of the services list (FIL-01): control number (OS), phase and status (AD-178), sphere, type (AD-177)
// and delivery period. Option filters take several values (FIL-03).
export function useCasesFilters(search: CasesSearch, onChange: Patch): TableFilterItem[] {
  const officeTypes = useQuery(serviceTypesQuery);
  // "Tipo" mixes Perícia/Assistência técnica (`role`) and the office's own types (`serviceType`).
  const types = [...(search.role ?? []), ...(search.serviceType ?? []).map((name) => `${OWN_TYPE_PREFIX}${name}`)];
  const chooseTypes = (values: string[] | undefined) => {
    const role = (values ?? []).filter((value) => !value.startsWith(OWN_TYPE_PREFIX)) as CasesSearch['role'] & {};
    const own = (values ?? []).filter((value) => value.startsWith(OWN_TYPE_PREFIX));
    onChange({
      role: role.length ? role : undefined,
      serviceType: own.length ? own.map((value) => value.slice(OWN_TYPE_PREFIX.length)) : undefined,
      page: 1,
    });
  };
  return [
    {
      label: t('control_number'),
      summary: search.serviceOrder,
      content: <ServiceOrderField value={search.serviceOrder} onChange={onChange} />,
    },
    {
      label: t('service_phase'),
      items: CASE_PHASE_ITEMS,
      value: search.phase,
      onChange: (phase) => onChange({ phase: phase as CasesSearch['phase'], page: 1 }),
    },
    {
      label: t('status'),
      items: CASE_STATUS_ITEMS,
      value: search.status,
      onChange: (status) => onChange({ status: status as CasesSearch['status'], page: 1 }),
    },
    {
      label: t('sphere'),
      items: COURT_TYPE_ITEMS,
      value: search.courtType,
      onChange: (courtType) => onChange({ courtType: courtType as CasesSearch['courtType'], page: 1 }),
    },
    {
      label: t('service_type'),
      items: serviceTypeItems(officeTypes.data ?? []),
      value: types.length ? types : undefined,
      onChange: chooseTypes,
    },
    {
      label: t('delivery_period'),
      summary: periodSummary(search.deliveryFrom, search.deliveryTo),
      content: (
        <>
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
        </>
      ),
    },
  ];
}
