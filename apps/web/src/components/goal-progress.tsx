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

// The pace written in words uses the text tone of each state: the indicator color is too light for small text.
const TONE_TEXT: Record<GoalTone, string> = {
  success: 'text-status-success-foreground',
  warning: 'text-status-warning-foreground',
  error: 'text-status-error-foreground',
};

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

const trackGradient = (direction: string) =>
  `linear-gradient(${direction}, color-mix(in oklab, ${TONE_COLOR.error} 22%, transparent), color-mix(in oklab, ${TONE_COLOR.warning} 22%, transparent), color-mix(in oklab, ${TONE_COLOR.success} 22%, transparent))`;

type GoalProgressProps = {
  goal: Goal;
  // `vertical`: a thick bar that fills from the bottom, beside the goal chart on the Dashboard.
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

// Bar of the revenue goal (MRA, AD-260, AD-261): the track is a faint red → yellow → green gradient (the scale from
// nothing to the goal), the fill is what was received in the pace color and the tick marks what was expected by now.
// With it, the share reached and the pace in words.
export function GoalProgress({ goal, orientation = 'horizontal', className }: GoalProgressProps) {
  const tone = goalTone(goal);
  const reached = Math.min(1, goal.receivedCents / goal.goalCents);
  const expected = Math.min(1, (goal.expectedCents ?? 0) / goal.goalCents);
  const share = `${percent.format(goal.receivedCents / goal.goalCents)} ${t('achieved')}`;
  const pace = goal.receivedCents >= goal.goalCents ? t('goal_reached') : t(GOAL_TONE_LABEL[tone]);
  const vertical = orientation === 'vertical';
  const bar = (
    <div
      role="progressbar"
      aria-label={t('revenue_goal')}
      aria-valuemin={0}
      aria-valuemax={goal.goalCents}
      aria-valuenow={Math.min(goal.receivedCents, goal.goalCents)}
      aria-valuetext={`${formatMoney(goal.receivedCents)} ${t('of').toLowerCase()} ${formatMoney(goal.goalCents)}, ${pace}`}
      className={cn(
        'relative flex overflow-hidden',
        vertical ? 'w-12 flex-1 flex-col justify-end rounded-xl' : 'h-2.5 w-full rounded-full',
      )}
      style={{ backgroundImage: trackGradient(vertical ? '0deg' : '90deg') }}
    >
      <div
        className={vertical ? 'w-full rounded-xl' : 'h-full rounded-full'}
        style={{ [vertical ? 'height' : 'width']: `${reached * 100}%`, backgroundColor: TONE_COLOR[tone] }}
      />
      {expected > 0 && expected < 1 && (
        <div
          aria-hidden
          className={cn('absolute bg-foreground/60', vertical ? 'inset-x-0 h-0.5' : 'inset-y-0 w-0.5')}
          style={vertical ? { bottom: `calc(${expected * 100}% - 1px)` } : { left: `calc(${expected * 100}% - 1px)` }}
        />
      )}
    </div>
  );
  if (vertical) {
    return (
      <div className={cn('flex w-24 flex-col items-center gap-2', className)}>
        <ItemDescription className="text-center text-xs text-inherit">{share}</ItemDescription>
        {bar}
        <ItemDescription className={cn('text-center text-xs line-clamp-none', TONE_TEXT[tone])}>{pace}</ItemDescription>
      </div>
    );
  }
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {bar}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <ItemDescription className="text-xs text-inherit">{share}</ItemDescription>
        <ItemDescription className={cn('text-xs', TONE_TEXT[tone])}>{pace}</ItemDescription>
      </div>
    </div>
  );
}
