import type { ReportType } from '@ethica/contracts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/helpers/translate.helper.js';
import { templatesQuery } from '@/query/report.js';

// Templates of the office: every one when starting the report (PSV-04); only the draft's type when
// changing it (LMO-01). Those of the service's area come first (BIB-05).
export function TemplateSelect({
  type,
  area,
  value,
  onChange,
}: {
  type?: ReportType;
  area?: string;
  value: string;
  onChange: (templateId: string) => void;
}) {
  const templates = useQuery(templatesQuery(type));
  const sorted = [...(templates.data ?? [])].sort(
    (a, b) => Number(Boolean(area) && b.area === area) - Number(Boolean(area) && a.area === area),
  );
  const items = sorted.map((item) => ({
    value: item.id,
    // Details (AD-181) set apart templates of the same NR annex.
    label: [item.name, item.details, !type && t(item.type)].filter(Boolean).join(' · '),
  }));
  return (
    <Select items={items} value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="w-full sm:w-96" aria-label={t('template')}>
        <SelectValue placeholder={t('choose_template')} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
