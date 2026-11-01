import { type CreateCase, createCaseSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { createCaseMutation } from '@/query/case.js';
import type { CaseFormValues } from '../../@interface/cases.interface.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';

export function useCaseForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Os campos são os mesmos da edição (+ prazo do laudo); a validação é a da criação.
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(createCaseSchema) as unknown as Resolver<CaseFormValues>,
    defaultValues: DEFAULT_VALUES,
  });
  const mutation = useMutation(createCaseMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CaseFormValues) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(data as CreateCase, {
      onSuccess: (created) => navigate({ to: '/expert-cases/details', search: { id: created.id } }),
      onError: (error: Error) => setErrorMessage(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
