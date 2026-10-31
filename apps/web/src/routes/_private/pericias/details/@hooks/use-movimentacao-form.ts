import { type CreateMovimentacao, createMovimentacaoSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { addMovimentacaoMutation } from '@/query/pericia.js';

// Lança uma movimentação do processo (AD-121) na perícia.
export function useMovimentacaoForm({ periciaId, onDone }: { periciaId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateMovimentacao>({
    resolver: zodResolver(createMovimentacaoSchema),
    defaultValues: { data: '', observacoes: '' },
  });
  const mutation = useMutation(addMovimentacaoMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateMovimentacao) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { periciaId, data },
      { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
