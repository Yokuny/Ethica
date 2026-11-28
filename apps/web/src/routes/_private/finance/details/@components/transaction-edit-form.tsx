import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { toast } from 'sonner';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord } from '@/query/transaction.js';
import { TransactionFields } from '../../@components/transaction-fields.js';
import { useTransactionForm } from '../../@hooks/use-transaction-form.js';

export const TRANSACTION_EDIT_FORM_ID = 'transaction-edit-form';

// Edit form under the entry reading (AD-312): always open, saved by the "Salvar" of the page header and footer.
export function TransactionEditForm({ transaction }: { transaction: TransactionRecord }) {
  const transactionForm = useTransactionForm({ transaction, onDone: () => toast.success(t('saved_successfully')) });
  const { form, onSubmit, errorMessage } = transactionForm;
  return (
    <Form {...form}>
      <form id={TRANSACTION_EDIT_FORM_ID} noValidate onSubmit={onSubmit} className="grid gap-4">
        <DefaultFormLayout
          sections={[
            {
              title: t('edit_entry'),
              fields: [<TransactionFields key="entry" transaction={transaction} form={transactionForm} />],
            },
          ]}
        />
        {errorMessage && (
          <ItemDescription role="alert" className="text-destructive line-clamp-none">
            {errorMessage}
          </ItemDescription>
        )}
      </form>
    </Form>
  );
}
