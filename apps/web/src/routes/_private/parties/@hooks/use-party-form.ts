import { type CreateParty, createPartySchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { createPartyMutation, type PartyRecord, updatePartyMutation } from '@/query/party.js';

// Same form to register and edit the party; the type is only chosen at registration (AD-117).
export function usePartyForm({ party, onDone }: { party?: PartyRecord; onDone: (saved: PartyRecord) => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateParty>({
    resolver: zodResolver(createPartySchema) as unknown as Resolver<CreateParty>,
    defaultValues: {
      type: party?.type ?? 'party',
      name: party?.name ?? '',
      document: party?.document ?? '',
      oab: party?.oab ?? '',
      email: party?.email ?? '',
      phone: party?.phone ?? '',
    },
  });
  const createMutation = useMutation(createPartyMutation(queryClient));
  const updateMutation = useMutation(updatePartyMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit({ type, ...data }: CreateParty) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (party) updateMutation.mutate({ id: party.id, data }, options);
    else createMutation.mutate({ type, ...data }, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
