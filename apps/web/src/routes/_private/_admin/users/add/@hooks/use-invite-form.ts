import { type CreateInvite, createInviteSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';

import { inviteMutation } from '../@query/invite.js';
export function useInviteForm() {
  const form = useForm<CreateInvite>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const [notice, setNotice] = useState('');
  const mutation = useMutation({
    ...inviteMutation(),
    onSuccess: (res) => {
      setNotice(res.message || t('invitation_sent'));
      if (!res.message) form.reset();
    },
  });
  const onSubmit = form.handleSubmit((data) => {
    if (mutation.isPending) return;
    setNotice('');
    mutation.mutate(data);
  });
  return {
    form,
    notice,
    errorMessage: mutation.error?.message,
    isPending: mutation.isPending,
    onSubmit,
  };
}
