import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { serviceTypeLabel } from '@/components/case-labels.js';
import { NEUTRAL_COLOR, SERIES_COLORS } from '@/components/composition-donut.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseDashboard } from '../@query/dashboard.js';
import { rankTypes, typeKey } from '../@utils/dashboard-period.js';

const LIMIT = SERIES_COLORS.length;
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const asDate = (month: string) => new Date(`${month}-15T12:00:00Z`);

type ServicesAreaChartProps = {
  // All services by type: the ranking that gives each type its color, the same as the mix donut.
  byType: CaseDashboard['byType'];
  // The months of the period, oldest to newest.
  byMonth: CaseDashboard['byMonth'];
};

// Service intake (AD-255): new services per month, stacked by type, so the height is the month's total and the
// bands are its composition. The 4 busiest types have their own color, the rest is "Others" in gray.
export function ServicesAreaChart({ byType, byMonth }: ServicesAreaChartProps) {
  const ranked = rankTypes(byType);
  const top = ranked.slice(0, LIMIT);
  const series = [
    ...top.map((row, index) => ({
      key: `t${index}`,
      type: typeKey(row),
      label: serviceTypeLabel(row),
      color: SERIES_COLORS[index],
    })),
    ...(ranked.length > LIMIT ? [{ key: 'others', type: '', label: t('remaining'), color: NEUTRAL_COLOR }] : []),
  ];
  const topKeys = new Map(series.filter((serie) => serie.type).map((serie) => [serie.type, serie.key]));
  const data = byMonth.map((month) => {
    const row: Record<string, number | string> = { month: month.month };
    for (const serie of series) row[serie.key] = 0;
    for (const type of month.byType) {
      const key = topKeys.get(typeKey(type)) ?? 'others';
      row[key] = Number(row[key] ?? 0) + type.count;
    }
    return row;
  });
  const config = Object.fromEntries(
    series.map((serie) => [serie.key, { label: serie.label, color: serie.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full" role="img" aria-label={t('services_intake')}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(month: string) => monthShort.format(asDate(month)).replace('.', '')}
        />
        <YAxis width={32} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 'auto']} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(month) => monthLong.format(asDate(String(month)))} />}
        />
        {series.map((serie) => (
          <Area
            key={serie.key}
            dataKey={serie.key}
            stackId="intake"
            type="monotone"
            // Translucent fill like the other charts (AD-260); the darker edge keeps each band readable.
            stroke={`color-mix(in oklab, var(--color-${serie.key}) 65%, var(--foreground))`}
            fill={`var(--color-${serie.key})`}
            fillOpacity={0.25}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
