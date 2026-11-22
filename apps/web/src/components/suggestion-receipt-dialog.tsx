import { type CreateInstallment, createInstallmentSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DefaultLoading } from '@/components/default-loading.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, MoneyField, TextField } from '@/components/form-fields.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { decideSuggestionMutation, type SuggestionRecord } from '@/query/notification.js';
import { type TransactionRecord, transactionsQuery } from '@/query/transaction.js';

// Accepting the receipt suggestion (AD-269): the open income of the case and the amount (the balance by
// default), the date (the court movement day by default) and the account, confirmed by the person; the court
// tells neither the amount nor whose money it is.
export function SuggestionReceiptDialog({
  suggestion,
  onClose,
}: {
  suggestion: SuggestionRecord;
  onClose: () => void;
}) {
  const query = useQuery(transactionsQuery({ caseId: suggestion.caseId, kind: 'income', limit: 20 }));
  const open = (query.data?.items ?? []).filter((item) => item.status === 'expected' || item.status === 'partial');
  const [chosen, setChosen] = useState<TransactionRecord>();
  const income = chosen ?? (open.length === 1 ? open[0] : undefined);

  return (
    <FormDialog title={t('register_receipt')} description={t('suggestion_receipt_warning')} size="sm" onClose={onClose}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !open.length ? (
        <ItemDescription className="line-clamp-none">{t('no_open_income')}</ItemDescription>
      ) : !income ? (
        <div className="grid gap-2">
          {open.map((item) => (
            <Button key={item.id} variant="outline" onClick={() => setChosen(item)}>
              {`${item.description} · ${t('balance_due')} ${formatMoney(item.balanceCents ?? item.amountCents)}`}
            </Button>
          ))}
        </div>
      ) : (
        <ReceiptFields suggestion={suggestion} income={income} onClose={onClose} />
      )}
    </FormDialog>
  );
}

function ReceiptFields({
  suggestion,
  income,
  onClose,
}: {
  suggestion: SuggestionRecord;
  income: TransactionRecord;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation(decideSuggestionMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<CreateInstallment>({
    resolver: zodResolver(createInstallmentSchema),
    defaultValues: {
      amountCents: income.balanceCents ?? income.amountCents,
      date: suggestion.proposal.target === 'transaction_installment' ? suggestion.proposal.date : '',
      account: '',
    },
  });
  const onSubmit = form.handleSubmit((data) => {
    setErrorMessage(null);
    mutation.mutate(
      {
        id: suggestion.id,
        decision: 'accept',
        data: { transactionId: income.id, ...data, account: data.account || undefined },
      },
      {
        onSuccess: () => {
          toast.success(t('suggestion_applied'));
          onClose();
        },
        onError: (error: Error) => setErrorMessage(error.message),
      },
    );
  });

  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <ItemDescription className="line-clamp-none">
          {`${income.description} · ${t('balance_due')} ${formatMoney(income.balanceCents ?? income.amountCents)}`}
        </ItemDescription>
        <MoneyField control={form.control} name="amountCents" label={t('amount')} placeholder={t('example_money')} />
        <DateField
          control={form.control}
          name="date"
          label={t('payment_date')}
          placeholder={t('choose_day')}
          required
        />
        <TextField
          control={form.control}
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
            {t('approve')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
