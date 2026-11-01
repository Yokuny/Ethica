import { type CreatePericia, createPericiaSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { createPericiaMutation } from '@/query/pericia.js';
import type { PericiaFormValues } from '../../@interface/pericias.interface.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';

export function usePericiaForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Os campos são os mesmos da edição (+ prazo do laudo); a validação é a da criação.
  const form = useForm<PericiaFormValues>({
    resolver: zodResolver(createPericiaSchema) as unknown as Resolver<PericiaFormValues>,
    defaultValues: DEFAULT_VALUES,
  });
  const mutation = useMutation(createPericiaMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: PericiaFormValues) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(data as CreatePericia, {
      onSuccess: (created) => navigate({ to: '/expert-cases/details', search: { id: created.id } }),
      onError: (error: Error) => setErrorMessage(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
