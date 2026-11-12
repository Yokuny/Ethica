import { type AcceptInvite, acceptInviteSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { acceptInvite } from '../@query/invite.js';

// APA-04 (AD-220): accepting hands over the ticket for the passkey of this device.
export function useInviteForm(token: string) {
  const [submitError, setSubmitError] = useState<string>();
  const [passkeyToken, setPasskeyToken] = useState<string>();
  const form = useForm<AcceptInvite>({ resolver: zodResolver(acceptInviteSchema) });

  const onSubmit = async (data: AcceptInvite) => {
    setSubmitError(undefined);
    const response = await acceptInvite(token, data);
    if (!response.success || !response.data) {
      setSubmitError(response.message || t('action_error'));
      return;
    }
    setPasskeyToken(response.data.passkeyToken);
  };

  return { form, submitError, passkeyToken, onSubmit };
}
