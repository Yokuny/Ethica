import { ItemDescription } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { RevenueGoal } from '@/query/transaction.js';

export type GoalTone = 'success' | 'warning' | 'error';
type Goal = RevenueGoal & { goalCents: number };

// Pace of the revenue goal (AD-260): what was received against the goal's monthly average times the months lived.
// At or above it, or the goal reached, is green; from 75% of it, yellow; below, red.
export const goalTone = (goal: Goal): GoalTone => {
  if (goal.receivedCents >= goal.goalCents || goal.receivedCents >= (goal.expectedCents ?? 0)) return 'success';
  return goal.receivedCents >= 0.75 * (goal.expectedCents ?? 0) ? 'warning' : 'error';
};

export const GOAL_TONE_LABEL: Record<GoalTone, string> = {
  success: 'on_pace',
  warning: 'slightly_below_pace',
  error: 'below_pace',
};

const TONE_COLOR: Record<GoalTone, string> = {
  success: 'var(--status-success-indicator)',
  warning: 'var(--status-warning-indicator)',
  error: 'var(--status-error-indicator)',
};

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

// Horizontal bar of the revenue goal (MRA, AD-260): the track is a faint red → yellow → green gradient (the scale
// from nothing to the goal), the fill is what was received in the pace color and the tick marks what was expected
// by now. Under it, the share reached and the pace in words.
export function GoalProgress({ goal, className }: { goal: Goal; className?: string }) {
  const tone = goalTone(goal);
  const reached = Math.min(1, goal.receivedCents / goal.goalCents);
  const expected = Math.min(1, (goal.expectedCents ?? 0) / goal.goalCents);
  const label = `${percent.format(goal.receivedCents / goal.goalCents)} ${t('achieved')}`;
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div
        role="progressbar"
        aria-label={t('revenue_goal')}
        aria-valuemin={0}
        aria-valuemax={goal.goalCents}
        aria-valuenow={Math.min(goal.receivedCents, goal.goalCents)}
        aria-valuetext={`${formatMoney(goal.receivedCents)} ${t('of').toLowerCase()} ${formatMoney(goal.goalCents)}`}
        className="relative h-2.5 w-full overflow-hidden rounded-full"
        style={{
          backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${TONE_COLOR.error} 22%, transparent), color-mix(in oklab, ${TONE_COLOR.warning} 22%, transparent), color-mix(in oklab, ${TONE_COLOR.success} 22%, transparent))`,
        }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${reached * 100}%`, backgroundColor: TONE_COLOR[tone] }}
        />
        {expected > 0 && expected < 1 && (
          <div
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-foreground/60"
            style={{ left: `calc(${expected * 100}% - 1px)` }}
          />
        )}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <ItemDescription className="text-xs text-inherit">{label}</ItemDescription>
        <ItemDescription className="text-xs" style={{ color: TONE_COLOR[tone] }}>
          {goal.receivedCents >= goal.goalCents ? t('goal_reached') : t(GOAL_TONE_LABEL[tone])}
        </ItemDescription>
      </div>
    </div>
  );
}
