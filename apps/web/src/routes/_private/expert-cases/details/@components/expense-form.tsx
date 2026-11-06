import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { ExpenseCategoryField } from '@/components/expense-category-field.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, MoneyField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useExpenseForm } from '../@hooks/use-expense-form.js';

export function ExpenseForm({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { form, onSubmit, isPending, errorMessage } = useExpenseForm({ caseId, onDone: onClose });
  const { control } = form;

  return (
    <FormDialog title={t('add_expense')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <ExpenseCategoryField />
          <MoneyField control={control} name="amountCents" label={t('amount')} placeholder={t('example_money')} />
          <DateField control={control} name="dueDate" label={t('date')} placeholder={t('choose_day')} />
          <DateField control={control} name="settledDate" label={t('payment_date')} placeholder={t('choose_day')} />
          {errorMessage && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {errorMessage}
            </ItemDescription>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
