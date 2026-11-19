import { serviceTypeLabel } from '@/components/case-labels.js';
import { MonthHeatTable } from '@/components/month-heat-table.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseDashboard } from '../@query/dashboard.js';

const number = new Intl.NumberFormat('pt-BR');
const change = new Intl.NumberFormat('pt-BR', { signDisplay: 'exceptZero' });

// Services per month (AD-235): the total and one column per type that had a service in the period, the busiest
// type first; each count with its change against the month before.
export function CasesMonthTable({ byMonth }: { byMonth: CaseDashboard['byMonth'] }) {
  const types = new Map<string, { label: string; count: number }>();
  for (const { byType } of byMonth) {
    for (const type of byType) {
      const key = type.serviceType ?? type.role;
      const seen = types.get(key);
      types.set(key, { label: serviceTypeLabel(type), count: (seen?.count ?? 0) + type.count });
    }
  }
  const columns = [
    { key: 'total', label: t('total') },
    ...[...types].sort(([, a], [, b]) => b.count - a.count).map(([key, { label }]) => ({ key, label })),
  ];
  const rows = byMonth.map(({ month, count, byType }) => ({
    month,
    values: Object.fromEntries([
      ['total', count],
      ...byType.map((type) => [type.serviceType ?? type.role, type.count]),
    ]) as Record<string, number>,
  }));
  return <MonthHeatTable columns={columns} rows={rows} format={number.format} formatChange={change.format} />;
}
