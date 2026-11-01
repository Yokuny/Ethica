import { type CreateDeadline, createDeadlineSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createDeadlineMutation, type DeadlineRecord, updateDeadlineMutation } from '@/query/deadline.js';

// Mesmo formulário para criar e editar o prazo: com `prazo` edita, sem ele cria na perícia.
export function useDeadlineForm({
  caseId,
  deadline,
  onDone,
}: {
  caseId: string;
  deadline?: DeadlineRecord;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateDeadline>({
    resolver: zodResolver(createDeadlineSchema),
    defaultValues: {
      titulo: deadline?.titulo ?? '',
      vencimento: deadline?.vencimento ?? '',
      observacoes: deadline?.observacoes ?? '',
    },
  });
  const createMutation = useMutation(createDeadlineMutation(queryClient));
  const updateMutation = useMutation(updateDeadlineMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CreateDeadline) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (deadline) updateMutation.mutate({ id: deadline.id, data }, options);
    else createMutation.mutate({ caseId, data }, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
