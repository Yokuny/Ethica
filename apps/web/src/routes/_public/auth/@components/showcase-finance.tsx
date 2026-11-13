import { type ChartConfig, ChartContainer } from '@ethica/ui/components/chart';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { courtTypeLabel } from '@/components/case-labels.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10: a made-up finance dashboard with the receivable first — figures, amounts by sphere (shaded by
// amount) and the receivable of the last six months.

const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const RECEIVABLE = [540_000, 610_000, 720_000, 650_000, 830_000, 760_000].map((receivableCents, index) => {
  const now = new Date();
  return { month: monthName.format(new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)), receivableCents };
});
const compactMoney = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 0 });
const chartConfig = { receivableCents: { label: t('receivable'), color: 'var(--chart-1)' } } satisfies ChartConfig;

const FIGURES = [
  { label: t('receivable'), value: formatMoney(760_000), note: '+18%' },
  { label: t('overdue'), value: formatMoney(276_000), note: '-12%' },
  { label: t('received_this_month'), value: formatMoney(1_890_000) },
];

// Each column has its own soft tone: green where more is good, amber where more is a warning.
const GREEN = '#22c55e';
const AMBER = '#eab308';
const COLUMNS = [
  { label: t('receivable'), tone: GREEN },
  { label: t('overdue'), tone: AMBER },
  { label: t('received'), tone: GREEN },
];
const SPHERES = [
  { court: 'labor' as const, cells: [480_000, 96_000, 1_120_000] },
  { court: 'civil' as const, cells: [210_000, 180_000, 540_000] },
  { court: 'federal' as const, cells: [70_000, 0, 230_000] },
];
const COLUMN_MAX = COLUMNS.map((_, index) => Math.max(...SPHERES.map((sphere) => sphere.cells[index] ?? 0)));

// Heat-map cell: the higher the amount within its column, the stronger the soft tone; zero stays clear.
const shade = (cents: number, column: number) => ({
  backgroundColor:
    cents === 0
      ? 'transparent'
      : `color-mix(in oklab, ${COLUMNS[column]?.tone} ${Math.round((cents / (COLUMN_MAX[column] || 1)) * 14) + 5}%, transparent)`,
});

export function ShowcaseFinance() {
  return (
    <div className="flex h-full flex-col gap-5 p-4 sm:p-5">
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {FIGURES.map((figure) => (
          <div key={figure.label} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4">
              <ItemDescription className="text-[10px] uppercase tracking-wide">{figure.label}</ItemDescription>
              {figure.note && (
                <ItemDescription
                  className={`text-[10px] tabular-nums ${figure.note.startsWith('-') ? 'text-[crimson]' : 'text-green-600'}`}
                >
                  {figure.note}
                </ItemDescription>
              )}
            </div>
            <ItemTitle className="font-medium text-sm tabular-nums sm:text-base">{figure.value}</ItemTitle>
          </div>
        ))}
      </div>
      <Table className="border-separate border-spacing-1 text-[10px] sm:text-[11px] max-sm:[&_tr>*:last-child]:hidden">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="text-[10px]">{t('sphere')}</TableHead>
            {COLUMNS.map((column) => (
              <TableHead key={column.label} className="text-[10px]">
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {SPHERES.map((sphere) => (
            <TableRow key={sphere.court} className="border-0 hover:bg-transparent">
              <TableCell className="text-muted-foreground">{courtTypeLabel(sphere.court)}</TableCell>
              {sphere.cells.map((cents, index) => (
                <TableCell key={COLUMNS[index]?.label} style={shade(cents, index)} className="rounded-sm tabular-nums">
                  {formatMoney(cents)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ChartContainer config={chartConfig} className="aspect-auto h-32 w-full">
        <BarChart data={RECEIVABLE} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
          <YAxis
            width={36}
            tickLine={false}
            axisLine={false}
            fontSize={10}
            tickCount={3}
            tickFormatter={(cents: number) => compactMoney.format(cents / 100)}
          />
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
