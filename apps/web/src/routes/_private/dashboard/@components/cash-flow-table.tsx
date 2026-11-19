import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { HeatCell, HeatTilesLegend } from '@/components/heat-tiles.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { MonthlyFlow } from '@/query/transaction.js';

const SERIES = [
  { key: 'receivedCents', label: 'received' },
  { key: 'receivableCents', label: 'receivable' },
  { key: 'expensesCents', label: 'expenses' },
] as const;

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatMonth = (month: string) => monthLabel.format(new Date(`${month}-15T12:00:00Z`));
const changeFormat = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  style: 'currency',
  currency: 'BRL',
  signDisplay: 'exceptZero',
});
const formatChange = (cents: number) => changeFormat.format(cents / 100);
const balanceOf = (row: MonthlyFlow) => row.receivedCents - row.expensesCents;
const balanceTone = (cents: number) => (cents > 0 ? 'positive' : cents < 0 ? 'negative' : 'zero');

// Cash flow as a heat table: one row per month (newest on top), each value with its change against the month
// before. Received, receivable and expenses are tinted by their share of the column's largest month; the balance
// (received minus expenses) by its sign. `data` comes with one month more at the start, the base of the first change.
export function CashFlowTable({ data }: { data: MonthlyFlow[] }) {
  const rows = data.slice(1).map((row, index) => ({ row, previous: data[index] as MonthlyFlow }));
  const max = Object.fromEntries(SERIES.map(({ key }) => [key, Math.max(0, ...rows.map(({ row }) => row[key]))]));
  const received = rows.reduce((sum, { row }) => sum + row.receivedCents, 0);
  const expenses = rows.reduce((sum, { row }) => sum + row.expensesCents, 0);
  const current = rows.at(-1)?.row.month;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <ItemDescription>{t('balance_of_period')}</ItemDescription>
        <ItemTitle className="text-3xl font-medium tracking-tight tabular-nums text-impact">
          {formatMoney(received - expenses)}
        </ItemTitle>
        <ItemDescription className="tabular-nums">
          {`${t('received')} ${formatMoney(received)} · ${t('expenses')} ${formatMoney(expenses)}`}
        </ItemDescription>
      </div>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-2xl table-fixed border-separate border-spacing-2">
          <thead>
            <tr>
              {['month', ...SERIES.map(({ label }) => label), 'balance'].map((label) => (
                <th key={label} scope="col" className="text-left">
                  <ItemDescription className="text-xs font-normal">{t(label)}</ItemDescription>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map(({ row, previous }) => (
              <tr key={row.month}>
                <th scope="row" className="text-left">
                  <ItemTitle className="font-normal first-letter:uppercase">{formatMonth(row.month)}</ItemTitle>
                  {row.month === current && <ItemDescription className="text-xs">{t('in_progress')}</ItemDescription>}
                </th>
                {SERIES.map(({ key }) => (
                  <td key={key}>
                    <HeatCell
                      value={formatMoney(row[key])}
                      change={formatChange(row[key] - previous[key])}
                      ratio={max[key] ? row[key] / (max[key] as number) : 0}
                    />
                  </td>
                ))}
                <td>
                  <HeatCell
                    value={formatMoney(balanceOf(row))}
                    change={formatChange(balanceOf(row) - balanceOf(previous))}
                    balance={balanceTone(balanceOf(row))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HeatTilesLegend />
        <ItemDescription className="text-xs">{t('change_from_previous_month_note')}</ItemDescription>
      </div>
    </div>
  );
}
