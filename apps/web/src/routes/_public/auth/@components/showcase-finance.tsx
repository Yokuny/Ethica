import { type ChartConfig, ChartContainer } from '@ethica/ui/components/chart';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { Bar, BarChart } from 'recharts';
import { courtTypeLabel } from '@/components/case-labels.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10: a made-up finance dashboard with the receivable first — figures, amounts by sphere (shaded by
// amount) and the receivable of the last six months.

const RECEIVABLE = [540_000, 610_000, 720_000, 650_000, 830_000, 760_000].map((receivableCents, month) => ({
  month,
  receivableCents,
}));
const chartConfig = { receivableCents: { label: t('receivable'), color: 'var(--chart-1)' } } satisfies ChartConfig;

const FIGURES = [
  { label: t('receivable'), value: formatMoney(760_000), note: '+18%' },
  { label: t('overdue'), value: formatMoney(276_000), note: '-12%' },
  { label: t('received_this_month'), value: formatMoney(1_890_000) },
];

const COLUMNS = [t('receivable'), t('overdue'), t('received')];
const SPHERES = [
  { court: 'labor' as const, cells: [480_000, 96_000, 1_120_000] },
  { court: 'civil' as const, cells: [210_000, 180_000, 540_000] },
  { court: 'federal' as const, cells: [70_000, 0, 230_000] },
];
const MAX_CENTS = 1_120_000;

// The higher the amount, the stronger the (still faint) shade of the cell.
const shade = (cents: number) => ({
  backgroundColor: `color-mix(in oklab, var(--chart-1) ${Math.round((cents / MAX_CENTS) * 10) + 2}%, transparent)`,
});

export function ShowcaseFinance() {
  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <div className="grid grid-cols-3 gap-6">
        {FIGURES.map((figure) => (
          <div key={figure.label} className="flex flex-col gap-1">
            <ItemDescription className="text-[10px] uppercase tracking-wide">{figure.label}</ItemDescription>
            <ItemTitle className="font-medium text-base tabular-nums">{figure.value}</ItemTitle>
            {figure.note && <ItemDescription className="text-[10px] tabular-nums">{figure.note}</ItemDescription>}
          </div>
        ))}
      </div>
      <Table className="text-[11px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-[10px]">{t('sphere')}</TableHead>
            {COLUMNS.map((column) => (
              <TableHead key={column} className="text-[10px]">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {SPHERES.map((sphere) => (
            <TableRow key={sphere.court}>
              <TableCell className="text-muted-foreground">{courtTypeLabel(sphere.court)}</TableCell>
              {sphere.cells.map((cents, index) => (
                <TableCell key={COLUMNS[index]} style={shade(cents)} className="tabular-nums">
                  {formatMoney(cents)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ChartContainer config={chartConfig} className="aspect-auto h-28 w-full">
        <BarChart data={RECEIVABLE} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <Bar
            dataKey="receivableCents"
            fill="var(--color-receivableCents)"
            fillOpacity={0.18}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
