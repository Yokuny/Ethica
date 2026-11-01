import { type CreateAppointment, createAppointmentSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatDisplayDate, formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { type AppointmentRecord, createAppointmentMutation, updateAppointmentMutation } from '@/query/appointment.js';
import { casesQuery } from '@/query/case.js';
import { DEFAULT_DURATION_MINUTES } from '../@consts/calendar.js';

const CASES_LIMIT = 100;

const toValues = (appointment: AppointmentRecord): CreateAppointment => ({
  type: appointment.type,
  title: appointment.title,
  date: formatDisplayDate(appointment.start),
  time: formatDisplayTime(appointment.start),
  durationMinutes: Math.round((Date.parse(appointment.end) - Date.parse(appointment.start)) / 60_000),
  location: appointment.location,
  caseId: appointment.caseId,
  notes: appointment.notes,
});

// Mesmo formulário para criar e remarcar: com `compromisso` edita, sem ele cria.
export function useAppointmentForm({
  appointment,
  date,
  caseId,
  onDone,
}: {
  appointment?: AppointmentRecord;
  date?: string;
  caseId?: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const cases = useQuery(casesQuery({ limit: CASES_LIMIT }));
  const form = useForm<CreateAppointment>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: appointment
      ? toValues(appointment)
      : {
          type: 'inspection',
          title: '',
          date: date ?? formatDisplayDate(new Date()),
          time: '09:00',
          durationMinutes: DEFAULT_DURATION_MINUTES,
          caseId,
        },
  });
  const createMutation = useMutation(createAppointmentMutation(queryClient));
  const updateMutation = useMutation(updateAppointmentMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CreateAppointment) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (appointment) updateMutation.mutate({ id: appointment.id, data }, options);
    else createMutation.mutate(data, options);
  }

  const caseItems = (cases.data?.items ?? []).map((legalCase) => ({
    value: legalCase.id,
    label: `${legalCase.processNumber} · ${legalCase.subject}`,
  }));

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage, caseItems };
}
