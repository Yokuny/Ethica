import { calendarDateSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField } from '@/components/form-fields.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type TransactionRecord, updateTransactionMutation } from '@/query/transaction.js';

const paymentSchema = z.object({ settledDate: calendarDateSchema });

// "Marcar como pago" asks for the real payment day (AD-201).
export function PaymentForm({ transaction, onClose }: { transaction: TransactionRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updateTransactionMutation(queryClient));
  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { settledDate: '' },
  });

  function onSubmit({ settledDate }: z.infer<typeof paymentSchema>) {
    mutation.mutate({ id: transaction.id, data: { status: 'settled', settledDate } }, { onSuccess: onClose });
  }

  return (
    <FormDialog
      title={t('mark_as_paid')}
      description={`${transaction.description} · ${formatMoney(transaction.amountCents)}`}
      size="sm"
      onClose={onClose}
    >
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <DateField
            control={form.control}
            name="settledDate"
            label={t('payment_date')}
            placeholder={t('choose_day')}
            required
          />
          {mutation.error && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {mutation.error.message}
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
