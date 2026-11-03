import type { ReportType } from '@ethica/contracts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/helpers/translate.helper.js';
import { templatesQuery } from '@/query/report.js';

// Templates of the office: every one when starting the report (PSV-04); only the draft's type when
// changing it (LMO-01).
export function TemplateSelect({
  type,
  value,
  onChange,
}: {
  type?: ReportType;
  value: string;
  onChange: (templateId: string) => void;
}) {
  const templates = useQuery(templatesQuery(type));
  const items = (templates.data ?? []).map((item) => ({
    value: item.id,
    label: type ? item.name : `${item.name} · ${t(item.type)}`,
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
