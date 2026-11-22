import { ItemDescription } from '@ethica/ui/components/item';
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

// Income and expenses by category (AD-253): the two totals share one scale, so expenses show their real size next
// to income; each list of categories is measured against its own largest one, so they stay comparable among
// themselves. Sums equal the cash flow's received and expenses of the period.
export function CategoryBars({ income, expenses }: { income: CategoryTotal[]; expenses: CategoryTotal[] }) {
  const groups = [
    { key: 'income', label: t('received'), tone: 'info' as const, rows: income },
    { key: 'expense', label: t('expenses'), tone: 'error' as const, rows: expenses },
  ].map((group) => ({
    ...group,
    total: sumOf(group.rows, 'totalCents'),
    previous: sumOf(group.rows, 'previousCents'),
  }));
  const max = Math.max(0, ...groups.map((group) => group.total));
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
          <BarList
            tone={group.tone}
            max={max}
            items={[
              {
                key: 'total',
                label: group.label,
                amount: group.total,
                value: formatMoney(group.total),
                detail: change(group.total, group.previous),
                strong: true,
              },
            ]}
          />
          {group.rows.length ? (
            <div className="border-border border-l pl-4">
              <BarList
                tone={group.tone}
                items={group.rows.map((row) => ({
                  key: row.category,
                  label: t(row.category),
                  amount: row.totalCents,
                  value: formatMoney(row.totalCents),
                  detail: change(row.totalCents, row.previousCents),
                }))}
              />
            </div>
          ) : (
            <ItemDescription>{t('no_entries_yet')}</ItemDescription>
          )}
        </section>
      ))}
      <ItemDescription className="text-xs">{t('change_from_previous_period_note')}</ItemDescription>
    </div>
  );
}
