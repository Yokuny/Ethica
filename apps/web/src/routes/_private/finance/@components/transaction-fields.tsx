import { ExpenseCategoryField } from '@/components/expense-category-field.js';
import { DateField, MoneyField, SelectField, TextField } from '@/components/form-fields.js';
import { categoryItems, KIND_ITEMS } from '@/components/transaction-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord } from '@/query/transaction.js';
import type { useTransactionForm } from '../@hooks/use-transaction-form.js';

// Entry fields, shared by the "Novo lançamento" dialog and the edit form of the entry page (AD-312).
export function TransactionFields({
  transaction,
  form,
}: {
  transaction?: TransactionRecord;
  form: ReturnType<typeof useTransactionForm>;
}) {
  const { kind, handleKindChange, caseItems } = form;
  const { control } = form.form;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
        {kind === 'expense' ? (
          <ExpenseCategoryField />
        ) : (
          <SelectField
            control={control}
            name="category"
            label={t('category')}
            placeholder={t('select')}
            items={categoryItems(kind)}
          />
        )}
      </div>
      <TextField
        control={control}
        name="description"
        label={t('description')}
        placeholder={t('example_entry_description')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField control={control} name="amountCents" label={t('amount')} placeholder={t('example_money')} />
        <DateField control={control} name="dueDate" label={t('due_date')} placeholder={t('choose_day')} />
        {/* A fee already saved gets its dates in the receipts of the page. */}
        {(!transaction || (kind === 'expense' && transaction.status !== 'canceled')) && (
          <DateField control={control} name="settledDate" label={t('payment_date')} placeholder={t('choose_day')} />
        )}
      </div>
      <SelectField
        control={control}
        name="caseId"
        label={t('expert_case')}
        placeholder={t('no_linked_expert_case')}
        items={caseItems}
      />
    </div>
  );
}
