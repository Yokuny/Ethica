import { type AccessKeyRequest, type AccessKeyVerify, accessKeyRequestSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import {
  type AccessCodeForm,
  type AccessStep,
  accessCodeFormSchema,
  type OfficeForm,
  officeFormSchema,
} from '../@interface/auth.interface.js';
import { requestAccessKey, signup, verifyAccessKey } from '../@query/access.js';

// ACE-01 to ACE-04 (AD-155): e-mail → key (code typed here or the e-mail link) → office
// creation when the confirmed e-mail has no account yet.
export function useAccess(token?: string) {
  const navigate = useNavigate();
  const [step, setStep] = useState<AccessStep>(token ? 'checking' : 'email');
  const [email, setEmail] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const emailForm = useForm<AccessKeyRequest>({
    resolver: zodResolver(accessKeyRequestSchema),
    defaultValues: { email: '' },
  });
  const codeForm = useForm<AccessCodeForm>({
    resolver: zodResolver(accessCodeFormSchema),
    defaultValues: { code: '' },
  });
  const officeForm = useForm<OfficeForm>({
    resolver: zodResolver(officeFormSchema),
    defaultValues: { name: '', officeName: '', document: '' },
  });

  // Returns the next step, or undefined when the session was opened (navigates away).
  const verify = useCallback(
    async (data: AccessKeyVerify): Promise<AccessStep | undefined> => {
      setErrorMessage(undefined);
      const response = await verifyAccessKey(data);
      if (!response.success) {
        setErrorMessage(response.message || t('action_error'));
        return 'token' in data ? 'email' : 'code';
      }
      if (response.data?.signupToken) {
        setSignupToken(response.data.signupToken);
        return 'office';
      }
      navigate({ to: '/' });
    },
    [navigate],
  );

  // The e-mail link is checked once as the page opens (the key is single use); a dead link
  // falls back to the e-mail step with the reason.
  const checkedToken = useRef(false);
  useEffect(() => {
    if (!token || checkedToken.current) return;
    checkedToken.current = true;
    void verify({ token }).then((next) => next && setStep(next));
  }, [token, verify]);

  const onSubmitEmail = async (data: AccessKeyRequest) => {
    setErrorMessage(undefined);
    const response = await requestAccessKey(data);
    if (!response.success) {
      setErrorMessage(response.message || t('action_error'));
      return;
    }
    setEmail(data.email);
    codeForm.reset();
    setStep('code');
  };

  const onSubmitCode = async (data: AccessCodeForm) => {
    const next = await verify({ email, code: data.code });
    if (next) setStep(next);
  };

  const onSubmitOffice = async (data: OfficeForm) => {
    setErrorMessage(undefined);
    const response = await signup({ ...data, signupToken });
    if (!response.success) {
      setErrorMessage(response.message || t('action_error'));
      return;
    }
    navigate({ to: '/' });
  };

  const resend = () => onSubmitEmail({ email });

  const changeEmail = () => {
    setErrorMessage(undefined);
    setStep('email');
  };

  return {
    step,
    email,
    errorMessage,
    emailForm,
    codeForm,
    officeForm,
    onSubmitEmail,
    onSubmitCode,
    onSubmitOffice,
    resend,
    changeEmail,
  };
}
