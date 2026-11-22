import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { MoneyField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useRevenueGoalForm } from '../@hooks/use-revenue-goal-form.js';
import type { OfficeView } from '../@query/office.js';

// Revenue goal of the current year (MRA-01, AD-258): what the office wants to receive; 0 leaves it without one.
export function OfficeRevenueGoal({ goal }: { goal: OfficeView['revenueGoal'] }) {
  const { form, onSubmit, isPending } = useRevenueGoalForm(goal);
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <div className="w-full max-w-xs">
          <MoneyField
            control={form.control}
            name="amountCents"
            label={`${t('goal_of')} ${goal.year}`}
            placeholder={t('amount')}
          />
        </div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}
