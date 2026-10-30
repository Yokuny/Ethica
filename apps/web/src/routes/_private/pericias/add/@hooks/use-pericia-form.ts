import { type CreatePericia, createPericiaSchema, type UpdatePericia } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { createPericiaMutation } from '@/query/pericia.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';

export function usePericiaForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Os campos são os mesmos da edição (UpdatePericia); a validação é a da criação.
  const form = useForm<UpdatePericia>({
    resolver: zodResolver(createPericiaSchema) as unknown as Resolver<UpdatePericia>,
    defaultValues: DEFAULT_VALUES,
  });
  const mutation = useMutation(createPericiaMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: UpdatePericia) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(data as CreatePericia, {
      onSuccess: (created) => navigate({ to: '/pericias/details', search: { id: created.id } }),
      onError: (error: Error) => setErrorMessage(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
