import { type CreateModeloLaudo, createModeloLaudoSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createModeloMutation, type ModeloLaudoRecord } from '@/query/laudo.js';

// Modelo novo em branco ou clonando outro do mesmo tipo (LAU-01.1). `base` pré-escolhe o clone.
export function useModeloCreateForm({
  base,
  onDone,
}: {
  base?: Pick<ModeloLaudoRecord, 'id' | 'nome' | 'tipo'>;
  onDone: (modelo: ModeloLaudoRecord) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateModeloLaudo>({
    resolver: zodResolver(createModeloLaudoSchema),
    defaultValues: { nome: base ? `${base.nome} (cópia)` : '', tipo: base?.tipo ?? 'report', baseId: base?.id },
  });
  const mutation = useMutation(createModeloMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateModeloLaudo) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(data, { onSuccess: onDone, onError: (error) => setErrorMessage(error.message) });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
