import { type CreateParcela, createParcelaSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { addParcelaMutation, type LancamentoRecord } from '@/query/lancamento.js';

// Registrar recebimento (PRZ-02): valor sugerido = saldo, data = hoje.
export function useRecebimentoForm({ lancamento, onDone }: { lancamento: LancamentoRecord; onDone: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateParcela>({
    resolver: zodResolver(createParcelaSchema),
    defaultValues: {
      valorCents: lancamento.saldoCents ?? lancamento.valorCents,
      data: formatDisplayDate(new Date()),
      conta: '',
    },
  });
  const mutation = useMutation(addParcelaMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateParcela) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { id: lancamento.id, data: { ...data, conta: data.conta || undefined } },
      { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
