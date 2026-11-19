import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { HeatCell, HeatTilesLegend } from '@/components/heat-tiles.js';
import { t } from '@/lib/helpers/translate.helper.js';

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatMonth = (month: string) => monthLabel.format(new Date(`${month}-15T12:00:00Z`));
const balanceTone = (value: number) => (value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero');

// `balance` columns are tinted by the sign; the others by the share of the column's largest month.
export type MonthHeatColumn = { key: string; label: string; balance?: boolean };

type MonthHeatTableProps = {
  columns: MonthHeatColumn[];
  // Oldest to newest; the last one is the current month. With `base`, the first only serves as the base of the
  // first change and is not shown.
  rows: { month: string; values: Record<string, number> }[];
  base?: boolean;
  format: (value: number) => string;
  formatChange: (value: number) => string;
};

// Heat table by month (AD-235): one row per month, newest on top, each value with its change against the month
// before written beside it. Nothing depends on hovering.
export function MonthHeatTable({ columns, rows, base, format, formatChange }: MonthHeatTableProps) {
  const shown = rows.map((row, index) => ({ row, previous: rows[index - 1] })).slice(base ? 1 : 0);
  const max = new Map(
    columns.map(({ key }) => [key, Math.max(0, ...shown.map(({ row }) => row.values[key] ?? 0))] as const),
  );
  const current = rows.at(-1)?.month;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-2 overflow-x-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-2"
          style={{ minWidth: `${8 + columns.length * 9}rem` }}
        >
          <thead>
            <tr>
              {[{ key: 'month', label: t('month') }, ...columns].map(({ key, label }) => (
                <th key={key} scope="col" className="text-left">
                  <ItemDescription className="text-xs font-normal">{label}</ItemDescription>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.reverse().map(({ row, previous }) => (
              <tr key={row.month}>
                <th scope="row" className="text-left">
                  <ItemTitle className="font-normal first-letter:uppercase">{formatMonth(row.month)}</ItemTitle>
                  {row.month === current && <ItemDescription className="text-xs">{t('in_progress')}</ItemDescription>}
                </th>
                {columns.map(({ key, balance }) => {
                  const value = row.values[key] ?? 0;
                  const change = previous && formatChange(value - (previous.values[key] ?? 0));
                  const largest = max.get(key) ?? 0;
                  return (
                    <td key={key}>
                      {balance ? (
                        <HeatCell value={format(value)} change={change} balance={balanceTone(value)} />
                      ) : (
                        <HeatCell value={format(value)} change={change} ratio={largest ? value / largest : 0} />
                      )}
                    </td>
                  );
                })}
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
