import { type UpdateCase, updateCaseSchema, validNominationDate } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { updateCaseMutation } from '@/query/case.js';
import type { CaseFormValues } from '../../@interface/cases.interface.js';
import type { CaseEditFormProps } from '../@interface/case-details.interface.js';

const CLEARABLE = [
  'courtType',
  'serviceType',
  'roleName',
  'phaseName',
  'contractor',
  'nominationDate',
  'docketingDate',
  'hireDate',
  'terminationDate',
  'nonPrescribedPeriodStart',
  'nonPrescribedPeriodEnd',
] as const;

export function useCaseEditForm({ legalCase, onSaved }: Pick<CaseEditFormProps, 'legalCase' | 'onSaved'>) {
  const queryClient = useQueryClient();
  const { id: _id, createdAt: _c, updatedAt: _u, opportunityId: _o, movements: _m, ...defaultValues } = legalCase;
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(
      updateCaseSchema.refine(validNominationDate, {
        message: t('nomination_date_required'),
        path: ['nominationDate'],
      }),
    ) as unknown as Resolver<CaseFormValues>,
    defaultValues,
  });
  const mutation = useMutation(updateCaseMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: UpdateCase) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    // A saved value left empty goes as null, which the API clears (AD-177): an erased date, or the own type's
    // fields when the service becomes judicial. Missing would keep what was saved.
    const cleared = Object.fromEntries(
      CLEARABLE.filter((key) => legalCase[key] !== undefined && data[key] === undefined).map((key) => [key, null]),
    );
    mutation.mutate(
      { id: legalCase.id, data: { ...data, ...cleared } },
      { onSuccess: onSaved, onError: (error: Error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
