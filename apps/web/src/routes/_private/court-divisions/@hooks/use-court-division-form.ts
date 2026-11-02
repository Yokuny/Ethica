import { type CreateCourtDivision, createCourtDivisionSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import {
  type CourtDivisionRecord,
  createCourtDivisionMutation,
  updateCourtDivisionMutation,
} from '@/query/court-division.js';

// Same form to register and edit; an emptied optional field is removed on the server.
export function useCourtDivisionForm({ division, onDone }: { division?: CourtDivisionRecord; onDone: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateCourtDivision>({
    resolver: zodResolver(createCourtDivisionSchema) as unknown as Resolver<CreateCourtDivision>,
    defaultValues: {
      courtType: division?.courtType ?? 'labor',
      name: division?.name ?? '',
      court: division?.court ?? '',
      state: division?.state,
      city: division?.city ?? '',
      address: division?.address ?? '',
      phones: division?.phones ?? '',
      email: division?.email ?? '',
      virtualDesk: division?.virtualDesk ?? '',
      notes: division?.notes ?? '',
    },
  });
  const createMutation = useMutation(createCourtDivisionMutation(queryClient));
  const updateMutation = useMutation(updateCourtDivisionMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CreateCourtDivision) {
    if (isPending) return;
    setErrorMessage(null);
    // Emptied field goes as '' so the server removes it (JSON drops `undefined`).
    const sent = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value ?? '']),
    ) as CreateCourtDivision;
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (division) updateMutation.mutate({ id: division.id, data: sent }, options);
    else createMutation.mutate(data, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
