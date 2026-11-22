import { useRender } from '@base-ui/react/use-render';
import { ChartContainer } from '@ethica/ui/components/chart';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { t } from '@/lib/helpers/translate.helper.js';

// Identity of each part (no state): the series palette in order; what is grouped or unclassified stays gray.
export const SERIES_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
export const NEUTRAL_COLOR = 'var(--status-neutral-indicator)';

export type DonutSlice = {
  key: string;
  label: string;
  amount: number;
  // The amount already written (count or money).
  value: string;
  // Context after the share: change against the previous period, recent count…
  detail?: string;
  // Fixed color (e.g. gray for "without court type"); otherwise the palette by position.
  color?: string;
  // Drill-down: the legend row becomes this link (`<Link to=… search=… />`).
  render?: ReactElement;
};

type CompositionDonutProps = {
  label: string;
  slices: DonutSlice[];
  format: (amount: number) => string;
  // Under the total in the center (e.g. the change against the previous period).
  centerDetail?: string;
  // Parts beyond this many go into one gray "Others (n)".
  limit?: number;
};

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

// Parts of one whole (AD-255): a donut with the total in the center and, beside it, the legend written with
// value, share and context, so nothing depends on hovering. Small parts are grouped in "Others".
export function CompositionDonut({ label, slices, format, centerDetail, limit = 4 }: CompositionDonutProps) {
  const sorted = [...slices].filter((slice) => slice.amount > 0).sort((a, b) => b.amount - a.amount);
  const fixed = sorted.filter((slice) => slice.color);
  const ranked = sorted.filter((slice) => !slice.color);
  const rest = ranked.slice(limit);
  const parts = [
    ...ranked.slice(0, limit).map((slice, index) => ({ ...slice, color: SERIES_COLORS[index] ?? NEUTRAL_COLOR })),
    ...(rest.length
      ? [
          {
            key: 'others',
            label: `${t('remaining')} (${rest.length})`,
            amount: rest.reduce((sum, slice) => sum + slice.amount, 0),
            value: format(rest.reduce((sum, slice) => sum + slice.amount, 0)),
            color: NEUTRAL_COLOR,
          } satisfies DonutSlice,
        ]
      : []),
    ...fixed,
  ];
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  const linked = parts.some((part) => part.render);

  return (
    // By the panel's width, not the screen's: in half a page the legend goes under the donut.
    <div className="@container">
      <div className="grid items-center gap-6 @xl:grid-cols-[11rem_1fr]">
        <div className="relative mx-auto size-44">
          <ChartContainer config={{}} className="aspect-square size-44" role="img" aria-label={label}>
            <PieChart>
              <Pie
                data={parts}
                dataKey="amount"
                nameKey="label"
                innerRadius="68%"
                outerRadius="100%"
                stroke="var(--background)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {parts.map((part) => (
                  <Cell key={part.key} fill={part.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <ItemTitle className="text-lg font-medium tabular-nums leading-tight">{format(total)}</ItemTitle>
            {centerDetail && <ItemDescription className="text-xs tabular-nums">{centerDetail}</ItemDescription>}
          </div>
        </div>
        <ul className="flex flex-col gap-0.5">
          {parts.map((part) => (
            <li key={part.key}>
              <LegendRow part={part} share={percent.format(total ? part.amount / total : 0)} linked={linked} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LegendRow({ part, share, linked }: { part: DonutSlice; share: string; linked: boolean }) {
  return useRender({
    defaultTagName: 'div',
    render: part.render,
    props: {
      className: cn(
        'flex items-center gap-3 rounded-md py-1.5',
        part.render &&
          '-mx-2 px-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/25',
      ),
      children: (
        <>
          <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: part.color }} />
          <div className="flex min-w-0 flex-1 flex-col">
            <ItemDescription className="truncate text-foreground">{part.label}</ItemDescription>
            {part.detail && <ItemDescription className="text-xs tabular-nums">{part.detail}</ItemDescription>}
          </div>
          <ItemTitle className="font-medium tabular-nums">{part.value}</ItemTitle>
          <ItemDescription className="w-10 text-right text-xs tabular-nums">{share}</ItemDescription>
          {linked && (
            <ChevronRight aria-hidden className={cn('size-4 text-muted-foreground', !part.render && 'invisible')} />
          )}
        </>
      ),
    },
  });
}
