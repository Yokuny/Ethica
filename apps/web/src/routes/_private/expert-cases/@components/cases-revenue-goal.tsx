import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { AppLink } from '@/components/app-link.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { RevenueGoal } from '@/query/transaction.js';

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

// Short line of the revenue goal on the services page (MRA-04), for whoever chose to follow it here; the full
// picture is on the Dashboard.
export function CasesRevenueGoal({ goal }: { goal: RevenueGoal & { goalCents: number } }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      <ItemDescription>
        {t('goal_of')} {goal.year}
      </ItemDescription>
      <ItemTitle className="font-normal">
        {formatMoney(goal.receivedCents)} {t('of').toLowerCase()} {formatMoney(goal.goalCents)} ·{' '}
        {percent.format(goal.receivedCents / goal.goalCents)} {t('achieved')}
      </ItemTitle>
      <AppLink to="/dashboard" as="description">
        {t('see_goal')}
      </AppLink>
    </div>
  );
}
