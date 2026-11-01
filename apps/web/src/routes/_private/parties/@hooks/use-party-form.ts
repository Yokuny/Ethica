import { type CreateParty, createPartySchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { createPartyMutation, type PartyRecord, updatePartyMutation } from '@/query/party.js';

// Mesmo formulário para cadastrar e editar a parte; o tipo só se escolhe no cadastro (AD-117).
export function usePartyForm({ party, onDone }: { party?: PartyRecord; onDone: (saved: PartyRecord) => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateParty>({
    resolver: zodResolver(createPartySchema) as unknown as Resolver<CreateParty>,
    defaultValues: {
      tipo: party?.tipo ?? 'party',
      nome: party?.nome ?? '',
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

  function onSubmit({ tipo, ...data }: CreateParty) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (party) updateMutation.mutate({ id: party.id, data }, options);
    else createMutation.mutate({ tipo, ...data }, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
