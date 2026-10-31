import { type CreatePrazo, createPrazoSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createPrazoMutation, type PrazoRecord, updatePrazoMutation } from '@/query/prazo.js';

// Mesmo formulário para criar e editar o prazo: com `prazo` edita, sem ele cria na perícia.
export function usePrazoForm({
  periciaId,
  prazo,
  onDone,
}: {
  periciaId: string;
  prazo?: PrazoRecord;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreatePrazo>({
    resolver: zodResolver(createPrazoSchema),
    defaultValues: {
      titulo: prazo?.titulo ?? '',
      vencimento: prazo?.vencimento ?? '',
      observacoes: prazo?.observacoes ?? '',
    },
  });
  const createMutation = useMutation(createPrazoMutation(queryClient));
  const updateMutation = useMutation(updatePrazoMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CreatePrazo) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (prazo) updateMutation.mutate({ id: prazo.id, data }, options);
    else createMutation.mutate({ periciaId, data }, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
