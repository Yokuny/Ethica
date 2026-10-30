import { type AcceptInvite, acceptInviteSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { acceptInvite } from '../@query/invite.js';

export function useInviteForm(token: string) {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string>();
  const form = useForm<AcceptInvite>({ resolver: zodResolver(acceptInviteSchema) });

  const onSubmit = async (data: AcceptInvite) => {
    setSubmitError(undefined);
    const response = await acceptInvite(token, data);
    if (!response.success) {
      setSubmitError(response.message || t('action_error'));
      return;
    }
    navigate({ to: '/' });
  };

  return { form, submitError, onSubmit };
}
