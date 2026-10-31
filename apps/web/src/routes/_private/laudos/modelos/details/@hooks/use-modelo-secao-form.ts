import { type ModeloSecao, modeloSecaoSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { type ModeloSecaoRecord, saveModeloSecaoMutation } from '@/query/laudo.js';

// Criar ou editar uma seção do modelo (LAU-01.2): com `secao` edita, sem ela acrescenta no fim.
export function useModeloSecaoForm({
  modeloId,
  secao,
  onDone,
}: {
  modeloId: string;
  secao?: ModeloSecaoRecord;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<ModeloSecao>({
    resolver: zodResolver(modeloSecaoSchema),
    defaultValues: {
      titulo: secao?.titulo ?? '',
      nivel: secao?.nivel ?? 1,
      apenasTitulo: secao?.apenasTitulo ?? false,
      quebraPagina: secao?.quebraPagina ?? false,
      textoSim: secao?.textoSim ?? '',
      textoNao: secao?.textoNao ?? '',
    },
  });
  const mutation = useMutation(saveModeloSecaoMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: ModeloSecao) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { id: modeloId, secaoId: secao?.id, data },
      { onSuccess: onDone, onError: (error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
