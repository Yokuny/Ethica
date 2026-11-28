import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { CASE_PHASE_ITEMS, CASE_STATUS_ITEMS, COURT_TYPE_ITEMS, SERVICE_TYPE_ITEMS } from '@/components/case-labels.js';
import { periodSummary, type TableFilterItem } from '@/components/data-table.js';
import { DatePicker } from '@/components/date-picker.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
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

// "Filtros" of the services list (FIL-01): control number (OS), situation (AD-308), phase and status (AD-178), sphere, type (AD-310)
// and delivery period. Option filters take several values (FIL-03).
export function useCasesFilters(search: CasesSearch, onChange: Patch): TableFilterItem[] {
  return [
    {
      label: t('control_number'),
      summary: search.serviceOrder,
      content: <ServiceOrderField value={search.serviceOrder} onChange={onChange} />,
    },
    {
      label: t('situation'),
      items: [
        { value: 'open', label: t('in_progress') },
        { value: 'closed', label: t('finished_plural') },
      ],
      value: search.situation,
      onChange: (situation) => onChange({ situation: situation as CasesSearch['situation'], page: 1 }),
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
      items: SERVICE_TYPE_ITEMS,
      value: search.serviceType,
      onChange: (serviceType) => onChange({ serviceType: serviceType as CasesSearch['serviceType'], page: 1 }),
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
