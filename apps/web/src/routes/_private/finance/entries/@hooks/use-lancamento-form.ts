import { type CreateLancamento, createLancamentoSchema, LANCAMENTO_CATEGORIAS } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { createLancamentoMutation, type LancamentoRecord, updateLancamentoMutation } from '@/query/lancamento.js';
import { periciasQuery } from '@/query/pericia.js';

const PERICIAS_LIMIT = 100;

// Mesmo formulário para lançar e editar: com `lancamento` edita, sem ele cria.
export function useLancamentoForm({ lancamento, onDone }: { lancamento?: LancamentoRecord; onDone: () => void }) {
  const queryClient = useQueryClient();
  const pericias = useQuery(periciasQuery({ limit: PERICIAS_LIMIT }));
  const form = useForm<CreateLancamento>({
    resolver: zodResolver(createLancamentoSchema),
    defaultValues: lancamento
      ? {
          natureza: lancamento.natureza,
          categoria: lancamento.categoria,
          descricao: lancamento.descricao,
          valorCents: lancamento.valorCents,
          vencimento: lancamento.vencimento,
          periciaId: lancamento.periciaId,
        }
      : {
          natureza: 'income',
          categoria: 'advance_fees',
          descricao: '',
          valorCents: 0,
          vencimento: formatDisplayDate(new Date()),
        },
  });
  const createMutation = useMutation(createLancamentoMutation(queryClient));
  const updateMutation = useMutation(updateLancamentoMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const natureza = form.watch('natureza');

  function onSubmit(data: CreateLancamento) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (lancamento) updateMutation.mutate({ id: lancamento.id, data }, options);
    else createMutation.mutate(data, options);
  }

  // Trocar a natureza leva a categoria para a primeira daquela natureza.
  function handleNaturezaChange(value: string) {
    form.setValue('categoria', LANCAMENTO_CATEGORIAS[value as CreateLancamento['natureza']][0]);
  }

  const periciaItems = (pericias.data?.items ?? []).map((pericia) => ({
    value: pericia.id,
    label: `${pericia.numeroProcesso} · ${pericia.objeto}`,
  }));

  return {
    form,
    natureza,
    onSubmit: form.handleSubmit(onSubmit),
    handleNaturezaChange,
    isPending,
    errorMessage,
    periciaItems,
  };
}
