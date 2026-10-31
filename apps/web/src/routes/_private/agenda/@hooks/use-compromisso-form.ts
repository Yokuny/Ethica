import { type CreateCompromisso, createCompromissoSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatDisplayDate, formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { type CompromissoRecord, createCompromissoMutation, updateCompromissoMutation } from '@/query/compromisso.js';
import { periciasQuery } from '@/query/pericia.js';
import { DEFAULT_DURATION_MINUTES } from '../@consts/calendar.js';

const PERICIAS_LIMIT = 100;

const toValues = (compromisso: CompromissoRecord): CreateCompromisso => ({
  tipo: compromisso.tipo,
  titulo: compromisso.titulo,
  date: formatDisplayDate(compromisso.inicio),
  time: formatDisplayTime(compromisso.inicio),
  duracaoMinutos: Math.round((Date.parse(compromisso.fim) - Date.parse(compromisso.inicio)) / 60_000),
  local: compromisso.local,
  periciaId: compromisso.periciaId,
  observacoes: compromisso.observacoes,
});

// Mesmo formulário para criar e remarcar: com `compromisso` edita, sem ele cria.
export function useCompromissoForm({
  compromisso,
  date,
  periciaId,
  onDone,
}: {
  compromisso?: CompromissoRecord;
  date?: string;
  periciaId?: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const pericias = useQuery(periciasQuery({ limit: PERICIAS_LIMIT }));
  const form = useForm<CreateCompromisso>({
    resolver: zodResolver(createCompromissoSchema),
    defaultValues: compromisso
      ? toValues(compromisso)
      : {
          tipo: 'inspection',
          titulo: '',
          date: date ?? formatDisplayDate(new Date()),
          time: '09:00',
          duracaoMinutos: DEFAULT_DURATION_MINUTES,
          periciaId,
        },
  });
  const createMutation = useMutation(createCompromissoMutation(queryClient));
  const updateMutation = useMutation(updateCompromissoMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CreateCompromisso) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (compromisso) updateMutation.mutate({ id: compromisso.id, data }, options);
    else createMutation.mutate(data, options);
  }

  const periciaItems = (pericias.data?.items ?? []).map((pericia) => ({
    value: pericia.id,
    label: `${pericia.numeroProcesso} · ${pericia.objeto}`,
  }));

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage, periciaItems };
}
