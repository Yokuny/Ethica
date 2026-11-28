import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { MONEY_COLORS } from '@/components/cash-flow-chart.js';
import { GoalProgress } from '@/components/goal-progress.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { RevenueGoal } from '@/query/transaction.js';

const GOAL_COLOR = 'var(--muted-foreground)';
const config = {
  receivedCents: { label: t('received_accumulated'), color: MONEY_COLORS.received },
  paceCents: { label: t('goal_pace'), color: GOAL_COLOR },
} satisfies ChartConfig;

const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const asDate = (month: string) => new Date(`${month}-15T12:00:00Z`);
const compactMoney = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 1,
});

function LegendItem({
  label,
  value,
  color,
  dashed,
}: {
  label: string;
  value: string;
  color?: string;
  dashed?: boolean;
}) {
  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        {color && (
          <span
            aria-hidden
            className="h-0.5 w-4 rounded-full"
            style={
              dashed
                ? {
                    backgroundImage: `linear-gradient(90deg, ${color} 50%, transparent 50%)`,
                    backgroundSize: '6px 2px',
                  }
                : { backgroundColor: color }
            }
          />
        )}
        <ItemDescription className="text-xs">{label}</ItemDescription>
      </div>
      <ItemTitle className="text-lg font-medium tabular-nums text-impact">{value}</ItemTitle>
    </li>
  );
}

// Revenue goal of a year (MRA-03, AD-258, AD-259): what was received, accumulated month by month (green area, up to
// the current month), against the goal spread evenly over the year (dashed gray line ending at the goal in December).
// Above, the goal and what is left; on the right, the thick vertical goal bar with the pace (AD-260, AD-261).
export function RevenueGoalChart({ goal }: { goal: RevenueGoal & { goalCents: number } }) {
  // Months already lived in the year: all of a past one, none of a future one.
  const lived = goal.year < goal.currentYear ? 12 : goal.year > goal.currentYear ? 0 : 13 - goal.monthsLeft;
  let accumulated = 0;
  const data = goal.byMonth.map((row, index) => {
    accumulated += row.receivedCents;
    return {
      month: row.month,
      receivedCents: index < lived ? accumulated : null,
      paceCents: Math.round((goal.goalCents * (index + 1)) / 12),
    };
  });
  const left = Math.max(0, goal.goalCents - goal.receivedCents);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-8 gap-y-3">
        <LegendItem
          label={config.receivedCents.label}
          value={formatMoney(goal.receivedCents)}
          color={config.receivedCents.color}
        />
        <LegendItem label={t('revenue_goal')} value={formatMoney(goal.goalCents)} color={GOAL_COLOR} dashed />
        <LegendItem label={t('left_to_goal')} value={formatMoney(left)} />
        {left > 0 && goal.perMonthCents ? (
          <LegendItem label={t('per_month_until_december')} value={formatMoney(goal.perMonthCents)} />
        ) : null}
      </ul>
      <div className="flex items-stretch gap-6">
        <ChartContainer
          config={config}
          className="aspect-auto h-64 min-w-0 flex-1"
          role="img"
          aria-label={`${t('goal_of')} ${goal.year}: ${formatMoney(goal.receivedCents)} ${t('of').toLowerCase()} ${formatMoney(goal.goalCents)}`}
        >
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(month: string) => monthShort.format(asDate(month)).replace('.', '')}
            />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              tickFormatter={(cents: number) => compactMoney.format(cents / 100)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(month) => monthLong.format(asDate(String(month)))}
                  valueFormatter={formatMoney}
                />
              }
            />
            <Area
              dataKey="receivedCents"
              type="monotone"
              stroke="var(--color-receivedCents)"
              strokeWidth={2}
              fill="var(--color-receivedCents)"
              fillOpacity={0.15}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="paceCents"
              type="linear"
              stroke="var(--color-paceCents)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
        <GoalProgress goal={goal} orientation="vertical" className="h-64 shrink-0" />
      </div>
    </div>
  );
}
