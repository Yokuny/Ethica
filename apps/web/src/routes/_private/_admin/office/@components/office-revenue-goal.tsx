import type { UpdateRevenueGoal } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type OfficeView, updateRevenueGoalMutation } from '../@query/office.js';
import { RevenueGoalDialog } from './revenue-goal-dialog.js';

// Revenue goals by year (MRA-01, AD-259): what the office wants to receive in each year, newest first.
export function OfficeRevenueGoal({ office }: { office: OfficeView }) {
  const queryClient = useQueryClient();
  const removal = useMutation(updateRevenueGoalMutation(queryClient));
  const [editing, setEditing] = useState<UpdateRevenueGoal | 'new' | null>(null);
  const [removing, setRemoving] = useState<UpdateRevenueGoal | null>(null);

  return (
    <div className="flex w-full flex-col items-start gap-3">
      {office.revenueGoals.length ? (
        <ItemGroup>
          {office.revenueGoals.map((goal) => (
            <Item key={goal.year} render={<li />}>
              <ItemContent>
                <ItemDescription>{`${t('goal_of')} ${goal.year}`}</ItemDescription>
                <ItemTitle className="text-base tabular-nums">{formatMoney(goal.amountCents)}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <Button variant="ghost" size="sm" onClick={() => setRemoving(goal)}>
                  {t('remove')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(goal)}>
                  {t('edit')}
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <ItemDescription>{t('no_revenue_goal_yet')}</ItemDescription>
      )}
      <Button variant="outline" onClick={() => setEditing('new')}>
        {t('new_revenue_goal')}
      </Button>
      {editing && (
        <RevenueGoalDialog
          office={office}
          goal={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={t('remove_revenue_goal_question')}
          description={`${t('goal_of')} ${removing.year}: ${formatMoney(removing.amountCents)}`}
          confirmLabel={t('remove')}
          pending={removal.isPending}
          onClose={() => setRemoving(null)}
          onConfirm={() =>
            removal.mutate(
              { year: removing.year, amountCents: 0 },
              { onSuccess: () => setRemoving(null), onError: (error) => toast.error(error.message) },
            )
          }
        />
      )}
    </div>
  );
}
