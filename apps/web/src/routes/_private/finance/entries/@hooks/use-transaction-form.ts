import { type CreateTransaction, createTransactionSchema, TRANSACTION_CATEGORIES } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { casesQuery } from '@/query/case.js';
import { createTransactionMutation, type TransactionRecord, updateTransactionMutation } from '@/query/transaction.js';

const CASES_LIMIT = 100;

// Mesmo formulário para lançar e editar: com `lancamento` edita, sem ele cria.
export function useTransactionForm({ transaction, onDone }: { transaction?: TransactionRecord; onDone: () => void }) {
  const queryClient = useQueryClient();
  const cases = useQuery(casesQuery({ limit: CASES_LIMIT }));
  const form = useForm<CreateTransaction>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: transaction
      ? {
          kind: transaction.kind,
          category: transaction.category,
          description: transaction.description,
          amountCents: transaction.amountCents,
          dueDate: transaction.dueDate,
          caseId: transaction.caseId,
        }
      : {
          kind: 'income',
          category: 'advance_fees',
          description: '',
          amountCents: 0,
          dueDate: formatDisplayDate(new Date()),
        },
  });
  const createMutation = useMutation(createTransactionMutation(queryClient));
  const updateMutation = useMutation(updateTransactionMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const kind = form.watch('kind');

  function onSubmit(data: CreateTransaction) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (transaction) updateMutation.mutate({ id: transaction.id, data }, options);
    else createMutation.mutate(data, options);
  }

  // Trocar a natureza leva a categoria para a primeira daquela natureza.
  function handleKindChange(value: string) {
    form.setValue('category', TRANSACTION_CATEGORIES[value as CreateTransaction['kind']][0]);
  }

  const caseItems = (cases.data?.items ?? []).map((legalCase) => ({
    value: legalCase.id,
    label: `${legalCase.processNumber} · ${legalCase.subject}`,
  }));

  return {
    form,
    kind,
    onSubmit: form.handleSubmit(onSubmit),
    handleKindChange,
    isPending,
    errorMessage,
    caseItems,
  };
}
