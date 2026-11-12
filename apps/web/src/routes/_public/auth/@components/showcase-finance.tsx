import { Item, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { courtTypeLabel } from '@/components/case-labels.js';
import { FinanceFlowChart } from '@/components/finance-flow-chart.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { addMonthsToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { MonthlyFlow } from '@/query/transaction.js';

// APA-10: a made-up finance dashboard — indicators, fees by sphere (shaded by amount) and the
// cash flow chart of the real finance screens.

const THIS_MONTH = formatDisplayDate(new Date());
const FLOW: MonthlyFlow[] = [
  [920_000, 540_000, 110_000],
  [1_240_000, 610_000, 135_000],
  [980_000, 720_000, 98_000],
  [1_580_000, 650_000, 142_000],
  [1_310_000, 830_000, 120_000],
  [1_890_000, 760_000, 156_000],
].map(([receivedCents, receivableCents, expensesCents], index) => ({
  month: addMonthsToDisplayDate(THIS_MONTH, index - 5).slice(0, 7),
  receivedCents: receivedCents as number,
  receivableCents: receivableCents as number,
  expensesCents: expensesCents as number,
}));

const COLUMNS = [t('received'), t('receivable'), t('overdue')];
const SPHERES = [
  {
    court: 'labor' as const,
    cells: [
      [1_120_000, 12],
      [480_000, -4],
      [96_000, -8],
    ],
  },
  {
    court: 'civil' as const,
    cells: [
      [540_000, 6],
      [210_000, 3],
      [180_000, 15],
    ],
  },
  {
    court: 'federal' as const,
    cells: [
      [230_000, -2],
      [70_000, 0],
      [0, 0],
    ],
  },
];
const MAX_CENTS = 1_120_000;

// The higher the amount, the stronger the shade of the cell.
const shade = (cents: number) => ({
  backgroundColor: `color-mix(in oklab, var(--chart-1) ${Math.round((cents / MAX_CENTS) * 28) + 4}%, transparent)`,
});
const signed = (delta: number) => (delta > 0 ? `+${delta}%` : `${delta}%`);

export function ShowcaseFinance() {
  return (
    <Item className="flex-col flex-nowrap items-stretch gap-4 p-4">
      <RecordStats columns={3} className="py-3">
        <RecordStat
          label={t('received_this_month')}
          value={formatMoney(1_890_000)}
          sparkline={FLOW.map((month) => month.receivedCents)}
          trend="up"
          trendLabel="+44%"
        />
        <RecordStat label={t('receivable')} value={formatMoney(760_000)} sparkline={[540, 610, 720, 650, 830, 760]} />
        <RecordStat label={t('overdue')} value={formatMoney(276_000)} trend="down" trendLabel="-12%" />
      </RecordStats>
      <div className="flex flex-col gap-1">
        <ItemTitle>{t('by_sphere')}</ItemTitle>
        <ItemDescription>{t('compared_to_last_month')}</ItemDescription>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('sphere')}</TableHead>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {SPHERES.map((sphere) => (
            <TableRow key={sphere.court}>
              <TableCell>{courtTypeLabel(sphere.court)}</TableCell>
              {sphere.cells.map(([cents, delta], index) => (
                <TableCell key={COLUMNS[index]} style={shade(cents as number)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <ItemTitle className="tabular-nums">{formatMoney(cents)}</ItemTitle>
                    <ItemDescription className="tabular-nums">{signed(delta as number)}</ItemDescription>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FinanceFlowChart data={FLOW} />
    </Item>
  );
}
