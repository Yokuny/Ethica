import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, MoneyField, TextField } from '@/components/form-fields.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord } from '@/query/transaction.js';
import { useReceiptForm } from '../@hooks/use-receipt-form.js';

export function ReceiptForm({ transaction, onClose }: { transaction: TransactionRecord; onClose: () => void }) {
  const { form, onSubmit, isPending, errorMessage } = useReceiptForm({ transaction, onDone: onClose });
  const { control } = form;

  return (
    <FormDialog
      title={t('register_receipt')}
      description={`${transaction.descricao} · ${t('balance_due')} ${formatMoney(transaction.balanceCents ?? 0)}`}
      size="sm"
      onClose={onClose}
    >
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <MoneyField control={control} name="amountCents" label={t('amount')} placeholder={t('example_money')} />
          <DateField control={control} name="data" label={t('received_on')} placeholder={t('choose_day')} />
          <TextField
            control={control}
            name="account"
            label={t('account_or_note')}
            placeholder={t('example_bank_account')}
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
