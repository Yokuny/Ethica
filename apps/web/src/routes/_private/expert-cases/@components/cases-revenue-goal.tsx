import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ethica/ui/components/tooltip';
import { CircleHelp } from 'lucide-react';
import { GoalProgress } from '@/components/goal-progress.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { RevenueGoal } from '@/query/transaction.js';

// Revenue goal on the services page (MRA-04, AD-291): only "? Dados da meta"; the numbers open in the tooltip.
// The chart is on the Dashboard.
export function CasesRevenueGoal({ goal }: { goal: RevenueGoal & { goalCents: number } }) {
  const left = Math.max(0, goal.goalCents - goal.receivedCents);
  const rows = [
    { label: t('revenue_goal'), value: formatMoney(goal.goalCents) },
    { label: t('received_accumulated'), value: formatMoney(goal.receivedCents) },
    { label: t('left_to_goal'), value: left ? formatMoney(left) : t('goal_reached') },
    ...(left && goal.perMonthCents
      ? [{ label: t('per_month_until_december'), value: formatMoney(goal.perMonthCents) }]
      : []),
  ];
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleHelp aria-hidden className="size-3.5" />
        <ItemDescription render={<span />} className="text-inherit">
          {t('goal_data')}
        </ItemDescription>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex min-w-64 flex-col gap-2">
          <ItemTitle>
            {t('goal_of')} {goal.year}
          </ItemTitle>
          <GoalProgress goal={goal} />
          <dl className="flex flex-col gap-1">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4">
                <ItemDescription
                  render={<dt />}
                  className="text-xs text-inherit line-clamp-none first-letter:uppercase"
                >
                  {row.label}
                </ItemDescription>
                <ItemTitle render={<dd />}>{row.value}</ItemTitle>
              </div>
            ))}
          </dl>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
