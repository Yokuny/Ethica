import { type CreateInstallment, createInstallmentSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { addInstallmentMutation, type TransactionRecord } from '@/query/transaction.js';

// Registrar recebimento (PRZ-02): valor sugerido = saldo, data = hoje.
export function useReceiptForm({ transaction, onDone }: { transaction: TransactionRecord; onDone: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateInstallment>({
    resolver: zodResolver(createInstallmentSchema),
    defaultValues: {
      amountCents: transaction.balanceCents ?? transaction.amountCents,
      data: formatDisplayDate(new Date()),
      account: '',
    },
  });
  const mutation = useMutation(addInstallmentMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateInstallment) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { id: transaction.id, data: { ...data, account: data.account || undefined } },
      { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
