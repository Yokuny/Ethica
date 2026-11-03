import { type CreateTransaction, createTransactionSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { categoryLabel } from '@/components/transaction-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { createTransactionMutation } from '@/query/transaction.js';

// Expense of the service (SRV-05): category, amount and date; the description is the category.
export function useExpenseForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateTransaction>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      kind: 'expense',
      category: 'travel',
      description: '-',
      amountCents: 0,
      dueDate: formatDisplayDate(new Date()),
      caseId,
    },
  });
  const mutation = useMutation(createTransactionMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateTransaction) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { ...data, description: categoryLabel(data) },
      { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
