import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { BarList } from '@/components/bar-list.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CategoryTotal } from '@/query/transaction.js';

const moneyChange = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  style: 'currency',
  currency: 'BRL',
  signDisplay: 'exceptZero',
});
const percentChange = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  signDisplay: 'exceptZero',
  maximumFractionDigits: 0,
});

// Change against the previous period, in money and percent; without a base it is new.
const change = (current: number, previous: number) => {
  if (!previous) return current ? t('new_in_period') : '—';
  const diff = current - previous;
  return `${moneyChange.format(diff / 100)} · ${percentChange.format(diff / previous)}`;
};
const sumOf = (rows: CategoryTotal[], key: 'totalCents' | 'previousCents') =>
  rows.reduce((total, row) => total + row[key], 0);

// Income and expenses by category in the same scale (AD-253): the bars of both lists are measured against the
// largest category, so expenses show their real size next to income. Sums equal the cash flow's received and
// expenses of the period.
export function CategoryBars({ income, expenses }: { income: CategoryTotal[]; expenses: CategoryTotal[] }) {
  const max = Math.max(0, ...[...income, ...expenses].map((row) => row.totalCents));
  const groups = [
    { key: 'income', label: t('received'), tone: 'info' as const, rows: income },
    { key: 'expense', label: t('expenses'), tone: 'error' as const, rows: expenses },
  ];
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => {
        const total = sumOf(group.rows, 'totalCents');
        return (
          <section key={group.key} aria-label={group.label} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <ItemTitle className="font-medium">{group.label}</ItemTitle>
              <div className="flex items-baseline gap-3">
                <ItemTitle className="font-medium tabular-nums">{formatMoney(total)}</ItemTitle>
                <ItemDescription className="text-xs tabular-nums">
                  {change(total, sumOf(group.rows, 'previousCents'))}
                </ItemDescription>
              </div>
            </div>
            {group.rows.length ? (
              <BarList
                tone={group.tone}
                max={max}
                items={group.rows.map((row) => ({
                  key: row.category,
                  label: t(row.category),
                  amount: row.totalCents,
                  value: formatMoney(row.totalCents),
                  detail: change(row.totalCents, row.previousCents),
                }))}
              />
            ) : (
              <ItemDescription>{t('no_entries_yet')}</ItemDescription>
            )}
          </section>
        );
      })}
      <ItemDescription className="text-xs">{t('change_from_previous_period_note')}</ItemDescription>
    </div>
  );
}
