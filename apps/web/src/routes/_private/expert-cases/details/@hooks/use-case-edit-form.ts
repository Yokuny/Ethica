import { type UpdateCase, updateCaseSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { updateCaseMutation } from '@/query/case.js';
import type { CaseFormValues } from '../../@interface/cases.interface.js';
import type { CaseEditFormProps } from '../@interface/case-details.interface.js';

export function useCaseEditForm({ legalCase, onSaved }: Pick<CaseEditFormProps, 'legalCase' | 'onSaved'>) {
  const queryClient = useQueryClient();
  const {
    id: _id,
    createdAt: _c,
    updatedAt: _u,
    oportunidadeId: _o,
    state: _s,
    movements: _m,
    ...defaultValues
  } = legalCase;
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(updateCaseSchema) as unknown as Resolver<CaseFormValues>,
    defaultValues,
  });
  const mutation = useMutation(updateCaseMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: UpdateCase) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { id: legalCase.id, data },
      { onSuccess: onSaved, onError: (error: Error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
