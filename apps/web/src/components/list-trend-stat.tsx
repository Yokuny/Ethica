import type { ListStatsTrend } from '@ethica/contracts';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ethica/ui/components/tooltip';
import { CircleHelp } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import { RecordStat } from './record.js';

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const signed = (value: number) => `${value > 0 ? '+' : ''}${decimal.format(value)}`;
const trendLabels = { up: 'trend_up', down: 'trend_down', stable: 'trend_stable' } as const;

type Props = {
  label: string;
  value: string;
  trend?: ListStatsTrend;
  ratio?: number;
  event: string;
  average?: boolean;
};

type Row = { label: string; value: string };

// Gain/loss when there is a computable percentage; without a comparison base (previous
// period at zero) it falls back to the absolute delta.
function resultRow({ delta }: ListStatsTrend['comparison'], change?: number | null): Row {
  if (delta === 0) return { label: t('difference'), value: decimal.format(0) };
  if (change == null) return { label: t('trend_delta'), value: signed(delta) };
  return { label: delta > 0 ? t('trend_gain') : t('trend_loss'), value: `${decimal.format(Math.abs(change))}%` };
}

// The event in the tooltip identifies the series; the main number is still the
// current snapshot returned by the stats endpoint.
export function ListTrendStat({ label, value, trend, ratio, event, average = false }: Props) {
  const comparison = average ? t('compared_to_previous_30_day_average') : t('compared_to_previous_30_days');
  const change = trend?.changePercent;
  const values = trend?.comparison;
  const rows: Row[] = values
    ? [
        { label: average ? t('today') : t('current_period'), value: decimal.format(values.current) },
        { label: average ? t('daily_average') : t('previous_period'), value: decimal.format(values.previous) },
        resultRow(values, change),
      ]
    : [];
  const summary = [event, comparison, ...rows.map((row) => `${row.label}: ${row.value}`)].join('. ');
  return (
    <RecordStat
      label={label}
      value={value}
      trend={trend?.direction}
      trendLabel={trend ? t(trendLabels[trend.direction]) : undefined}
      sparkline={trend?.series}
      ratio={trend ? undefined : ratio}
      hint={change == null ? undefined : `${signed(change)}%`}
      headerAction={
        trend && (
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={summary}
              className="inline-flex shrink-0 text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CircleHelp aria-hidden className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex min-w-48 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <ItemTitle>{event}</ItemTitle>
                  <ItemDescription className="text-xs text-inherit line-clamp-none">{comparison}</ItemDescription>
                </div>
                {rows.length > 0 && (
                  <dl className="flex flex-col gap-1">
                    {rows.map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-4">
                        <ItemDescription render={<dt />} className="text-xs text-inherit line-clamp-none">
                          {row.label}
                        </ItemDescription>
                        <ItemTitle render={<dd />}>{row.value}</ItemTitle>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      }
    />
  );
}
