import { type CreateInstallment, createInstallmentSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, MoneyField, TextField } from '@/components/form-fields.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { addInstallmentMutation, type TransactionRecord } from '@/query/transaction.js';

// Registers a receipt on a fee (AD-111): it is an installment of that income, so it lowers its balance.
// The suggested amount is the balance; the date is the real payment day, always given (AD-201).
export function ReceiptForm({ transaction, onClose }: { transaction: TransactionRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateInstallment>({
    resolver: zodResolver(createInstallmentSchema),
    defaultValues: { amountCents: transaction.balanceCents ?? transaction.amountCents, date: '', account: '' },
  });
  const mutation = useMutation(addInstallmentMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { control } = form;

  const onSubmit = form.handleSubmit((data) => {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { id: transaction.id, data: { ...data, account: data.account || undefined } },
      { onSuccess: onClose, onError: (error: Error) => setErrorMessage(error.message) },
    );
  });

  return (
    <FormDialog
      title={t('register_receipt')}
      description={`${transaction.description} · ${t('balance_due')} ${formatMoney(transaction.balanceCents ?? 0)}`}
      size="sm"
      onClose={onClose}
    >
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <MoneyField control={control} name="amountCents" label={t('amount')} placeholder={t('example_money')} />
          <DateField control={control} name="date" label={t('payment_date')} placeholder={t('choose_day')} required />
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
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
