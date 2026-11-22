import { AppLink } from '@/components/app-link.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { Panel } from '@/components/panel.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { RevenueGoal } from '@/query/transaction.js';

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

// Revenue goal of the year (MRA-03, AD-258): received in the calendar year so far, by each payment's date, against
// the goal; the linear pace up to today and what is left per month. Year to date, outside the page's period.
// Without a goal only the admin sees the panel, as the invitation to set it in Office.
export function RevenueGoalPanel({ goal, isAdmin }: { goal: RevenueGoal; isAdmin: boolean }) {
  const title = `${t('goal_of')} ${goal.year}`;
  if (!goal.goalCents) {
    if (!isAdmin) return null;
    return (
      <Panel size="lg" title={title}>
        <DefaultEmptyData
          title={t('no_revenue_goal')}
          description={t('set_revenue_goal_in_office')}
          action={<AppLink to="/office">{t('office')}</AppLink>}
        />
      </Panel>
    );
  }
  const ratio = goal.receivedCents / goal.goalCents;
  const reached = goal.receivedCents >= goal.goalCents;
  const onPace = goal.receivedCents >= (goal.expectedCents ?? 0);
  const left = Math.max(0, goal.goalCents - goal.receivedCents);
  return (
    <Panel size="lg" title={title} description={t('revenue_goal_scope')}>
      <RecordStats variant="band" role="group" aria-label={title}>
        <RecordStat
          label={t('received')}
          value={formatMoney(goal.receivedCents)}
          hint={`${percent.format(ratio)} ${t('achieved')}`}
          ratio={Math.min(1, ratio)}
          description={`${t('of').toLowerCase()} ${formatMoney(goal.goalCents)}`}
        />
        <RecordStat
          label={t('left_to_goal')}
          value={reached ? t('goal_reached') : formatMoney(left)}
          dot={{ variant: reached ? 'success' : 'neutral' }}
        />
        <RecordStat
          label={t('expected_until_today')}
          value={formatMoney(goal.expectedCents ?? 0)}
          dot={{ variant: onPace ? 'success' : 'warning' }}
          description={t(onPace ? 'on_pace' : 'below_pace')}
        />
        <RecordStat label={t('needed_per_month')} value={formatMoney(goal.perMonthCents ?? 0)} />
      </RecordStats>
    </Panel>
  );
}
