import type { AutomationMonth } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { t } from '@/lib/helpers/translate.helper.js';

// Identity of each series (not a state): the first two of the chart palette, as in the other panels.
const config = {
  movements: { label: t('detected_movements'), color: 'color-mix(in oklab, var(--chart-1) 70%, var(--foreground))' },
  suggestions: { label: t('suggestions_made'), color: 'color-mix(in oklab, var(--chart-2) 70%, var(--foreground))' },
} satisfies ChartConfig;

// The y axis width and the right margin of the chart: the strip below lines up with the plot area.
const AXIS_WIDTH = 32;
const RIGHT_MARGIN = 8;

const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const asDate = (month: string) => new Date(`${month}-15T12:00:00Z`);
const shortName = (month: string) => monthShort.format(asDate(month)).replace('.', '');

// Constancy of the daily query in a month: every run answered for every case, some day without answer, or no run.
const queriesVariant = (row: AutomationMonth) =>
  !row.roundDays ? 'neutral' : row.completeDays === row.roundDays ? 'success' : 'warning';

// Activity of the automation (PAT-04): new movements and suggestions per month in lines, the axis from zero; under
// it, one cell per month with the days every case got an answer from the court out of the days with a run. The
// x axis keeps half a step at each end (`padding="gap"`), so each month sits in the middle of an equal column and
// the strip below uses the same columns.
export function AutomationActivityChart({ data }: { data: AutomationMonth[] }) {
  const sums = (Object.keys(config) as (keyof typeof config)[]).map((key) => ({
    key,
    label: config[key].label,
    color: config[key].color,
    total: data.reduce((total, row) => total + row[key], 0),
  }));
  const rounds = data.reduce((total, row) => total + row.roundDays, 0);
  const complete = data.reduce((total, row) => total + row.completeDays, 0);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-8 gap-y-3">
        {sums.map((item) => (
          <li key={item.key} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} />
              <ItemDescription className="text-xs">{item.label}</ItemDescription>
            </div>
            <ItemTitle className="text-lg font-medium tabular-nums text-impact">{item.total}</ItemTitle>
          </li>
        ))}
        <li className="flex flex-col gap-0.5">
          <ItemDescription className="text-xs">{t('court_queries')}</ItemDescription>
          <ItemTitle className="text-lg font-medium tabular-nums text-impact">
            {`${complete} ${t('of').toLowerCase()} ${rounds} ${t('days')}`}
          </ItemTitle>
        </li>
      </ul>
      <ChartContainer
        config={config}
        className="aspect-auto h-56 w-full"
        role="img"
        aria-label={`${t('automation_activity')}: ${sums.map((item) => `${item.label} ${item.total}`).join(', ')}`}
      >
        <LineChart data={data} margin={{ top: 8, right: RIGHT_MARGIN, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            padding="gap"
            tickFormatter={shortName}
          />
          <YAxis width={AXIS_WIDTH} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 'auto']} />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(month) => monthLong.format(asDate(String(month)))} />}
          />
          {sums.map((item) => (
            <Line
              key={item.key}
              dataKey={item.key}
              type="monotone"
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <div className="@container flex flex-col gap-2">
        <ItemDescription className="text-xs" style={{ paddingLeft: AXIS_WIDTH }}>
          {t('court_queries_scope')}
        </ItemDescription>
        <ul
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
            paddingLeft: AXIS_WIDTH,
            paddingRight: RIGHT_MARGIN,
          }}
        >
          {data.map((row) => (
            <li
              key={row.month}
              aria-label={`${monthLong.format(asDate(row.month))}: ${row.completeDays} ${t('of').toLowerCase()} ${row.roundDays} ${t('days')}`}
            >
              <Badge variant={queriesVariant(row)} className="w-full justify-center tabular-nums">
                {/* The count where it fits; on a narrow screen the color alone, the name says the rest. */}
                <span aria-hidden className="hidden @2xl:inline">
                  {row.roundDays ? `${row.completeDays}/${row.roundDays}` : '—'}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
