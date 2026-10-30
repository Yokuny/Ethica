import { type SignIn, signinSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { SIGN_IN_DEFAULT_VALUES } from '../@consts/sign-in-default-values.js';
import { signIn } from '../@query/sign-in.js';

export function useSignInForm() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string>();
  const form = useForm<SignIn>({ resolver: zodResolver(signinSchema), defaultValues: SIGN_IN_DEFAULT_VALUES });

  const onSubmit = async (data: SignIn) => {
    setErrorMessage(undefined);
    const response = await signIn(data);
    if (!response.success) {
      setErrorMessage(response.message || t('action_error'));
      return;
    }
    navigate({ to: '/' });
  };

  return { form, errorMessage, onSubmit };
}
