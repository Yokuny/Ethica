import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useTransactionForm } from '../@hooks/use-transaction-form.js';
import { TransactionFields } from './transaction-fields.js';

// "Novo lançamento" dialog of the list; the entry is edited on its own page (AD-312).
export function TransactionForm({ onClose }: { onClose: () => void }) {
  const transactionForm = useTransactionForm({ onDone: onClose });
  const { form, onSubmit, isPending, errorMessage } = transactionForm;

  return (
    <FormDialog title={t('new_entry')} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[{ title: t('entry'), fields: [<TransactionFields key="entry" form={transactionForm} />] }]}
          />
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
