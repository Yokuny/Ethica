import { type UpdatePericia, updatePericiaSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { updatePericiaMutation } from '@/query/pericia.js';
import type { PericiaEditFormProps } from '../@interface/pericia-details.interface.js';

export function usePericiaEditForm({ pericia, onSaved }: Pick<PericiaEditFormProps, 'pericia' | 'onSaved'>) {
  const queryClient = useQueryClient();
  const { id: _id, createdAt: _c, updatedAt: _u, oportunidadeId: _o, ...defaultValues } = pericia;
  const form = useForm<UpdatePericia>({ resolver: zodResolver(updatePericiaSchema), defaultValues });
  const mutation = useMutation(updatePericiaMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: UpdatePericia) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { id: pericia.id, data },
      { onSuccess: onSaved, onError: (error: Error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
