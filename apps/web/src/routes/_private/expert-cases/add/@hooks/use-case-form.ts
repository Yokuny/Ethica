import { type CreateCase, createCaseSchema, validContractor, validNominationDate } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { createCaseMutation } from '@/query/case.js';
import { useCaseAttachments } from '../../@hooks/use-case-attachments.js';
import type { CaseFormValues } from '../../@interface/cases.interface.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';

export function useCaseForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // The fields are the same as in editing (+ report deadline); the validation is the creation one.
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(
      createCaseSchema
        .refine(validContractor, { message: t('contractor_name_required'), path: ['contractor', 'name'] })
        .refine(validNominationDate, { message: t('nomination_date_required'), path: ['nominationDate'] }),
    ) as unknown as Resolver<CaseFormValues>,
    defaultValues: DEFAULT_VALUES,
  });
  const mutation = useMutation(createCaseMutation(queryClient));
  const attachments = useCaseAttachments();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = mutation.isPending || attachments.isUploading;

  function onSubmit(data: CaseFormValues) {
    if (isPending) return;
    setErrorMessage(null);
    mutation.mutate(data as CreateCase, {
      onSuccess: async (created) => {
        await attachments.upload(created.id);
        navigate({ to: '/expert-cases/details', search: { id: created.id } });
      },
      onError: (error: Error) => setErrorMessage(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage, attachments };
}
