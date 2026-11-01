import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, MoneyField, SelectField, TextField } from '@/components/form-fields.js';
import { categoryItems, KIND_ITEMS } from '@/components/transaction-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord } from '@/query/transaction.js';
import { useTransactionForm } from '../@hooks/use-transaction-form.js';
import { InstallmentsList } from './installments-list.js';

export function TransactionForm({ transaction, onClose }: { transaction?: TransactionRecord; onClose: () => void }) {
  const { form, kind, onSubmit, handleKindChange, isPending, errorMessage, caseItems } = useTransactionForm({
    transaction,
    onDone: onClose,
  });
  const { control } = form;

  return (
    <FormDialog title={t(transaction ? 'edit_entry' : 'new_entry')} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('entry'),
                fields: [
                  <div key="type" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={control}
                      name="kind"
                      label={t('nature')}
                      placeholder={t('select')}
                      items={KIND_ITEMS}
                      onValueChange={handleKindChange}
                      // The kind does not change after posting (different status rules, AD-111).
                      disabled={Boolean(transaction)}
                    />
                    <SelectField
                      control={control}
                      name="category"
                      label={t('category')}
                      placeholder={t('select')}
                      items={categoryItems(kind)}
                    />
                  </div>,
                  <TextField
                    key="description"
                    control={control}
                    name="description"
                    label={t('description')}
                    placeholder={t('example_entry_description')}
                  />,
                  <div key="amount" className="grid gap-4 sm:grid-cols-2">
                    <MoneyField
                      control={control}
                      name="amountCents"
                      label={t('amount')}
                      placeholder={t('example_money')}
                    />
                    <DateField control={control} name="dueDate" label={t('due_date')} placeholder={t('choose_day')} />
                  </div>,
                  <SelectField
                    key="legalCase"
                    control={control}
                    name="caseId"
                    label={t('expert_case')}
                    placeholder={t('no_linked_expert_case')}
                    items={caseItems}
                  />,
                ],
              },
            ]}
          />
          {transaction?.kind === 'income' && <InstallmentsList transaction={transaction} onChanged={onClose} />}
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
