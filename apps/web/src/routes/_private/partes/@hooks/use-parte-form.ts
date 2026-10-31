import { type CreateParte, createParteSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { createParteMutation, type ParteRecord, updateParteMutation } from '@/query/parte.js';

// Mesmo formulário para cadastrar e editar a parte; o tipo só se escolhe no cadastro (AD-117).
export function useParteForm({ parte, onDone }: { parte?: ParteRecord; onDone: (saved: ParteRecord) => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateParte>({
    resolver: zodResolver(createParteSchema) as unknown as Resolver<CreateParte>,
    defaultValues: {
      tipo: parte?.tipo ?? 'party',
      nome: parte?.nome ?? '',
      documento: parte?.documento ?? '',
      oab: parte?.oab ?? '',
      email: parte?.email ?? '',
      telefone: parte?.telefone ?? '',
    },
  });
  const createMutation = useMutation(createParteMutation(queryClient));
  const updateMutation = useMutation(updateParteMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit({ tipo, ...data }: CreateParte) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (parte) updateMutation.mutate({ id: parte.id, data }, options);
    else createMutation.mutate({ tipo, ...data }, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
