import { type CreateMovement, createMovementSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { addMovementMutation } from '@/query/case.js';

// Lança uma movimentação do processo (AD-121) na perícia.
export function useMovementForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateMovement>({
    resolver: zodResolver(createMovementSchema),
    defaultValues: { date: '', notes: '' },
  });
  const mutation = useMutation(addMovementMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateMovement) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate({ caseId, data }, { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
