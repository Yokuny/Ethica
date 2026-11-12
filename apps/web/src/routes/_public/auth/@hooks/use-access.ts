import { type AccessKeyRequest, type AccessKeyVerify, accessKeyRequestSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { signinWithPasskey } from '@/query/passkey.js';
import {
  type AccessCodeForm,
  type AccessStep,
  accessCodeFormSchema,
  type OfficeForm,
  officeFormSchema,
} from '../@interface/auth.interface.js';
import { requestAccessKey, signup, verifyAccessKey } from '../@query/access.js';

// ACE-01 to ACE-04 (AD-155): e-mail → key (code typed here or the e-mail link) → office creation
// when the confirmed e-mail has no account yet. AD-220: every path ends creating the passkey of this
// device; a device that already has one signs in with it, without e-mail (APA-02).
export function useAccess(token?: string) {
  const navigate = useNavigate();
  const [step, setStep] = useState<AccessStep>(token ? 'checking' : 'email');
  const [email, setEmail] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [passkeyToken, setPasskeyToken] = useState('');
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

  const verify = useCallback(async (data: AccessKeyVerify): Promise<AccessStep> => {
    setErrorMessage(undefined);
    const response = await verifyAccessKey(data);
    if (!response.success || !response.data) {
      setErrorMessage(response.message || t('action_error'));
      return 'token' in data ? 'email' : 'code';
    }
    if ('signupToken' in response.data) {
      setSignupToken(response.data.signupToken);
      return 'office';
    }
    setPasskeyToken(response.data.passkeyToken);
    return 'passkey';
  }, []);

  // The e-mail link is checked once as the page opens (the key is single use); a dead link
  // falls back to the e-mail step with the reason.
  const checkedToken = useRef(false);
  useEffect(() => {
    if (!token || checkedToken.current) return;
    checkedToken.current = true;
    void verify({ token }).then(setStep);
  }, [token, verify]);

  // APA-02: the browser offers this device's passkey among the e-mail field suggestions.
  useEffect(() => {
    if (token) return;
    void browserSupportsWebAuthnAutofill().then(async (supported) => {
      if (supported && !(await signinWithPasskey(true))) navigate({ to: '/' });
    });
  }, [token, navigate]);

  const signinWithDevice = async () => {
    setErrorMessage(undefined);
    const error = await signinWithPasskey();
    if (error) {
      setErrorMessage(error);
      return;
    }
    navigate({ to: '/' });
  };

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
    setStep(await verify({ email, code: data.code }));
  };

  const onSubmitOffice = async (data: OfficeForm) => {
    setErrorMessage(undefined);
    const response = await signup({ ...data, signupToken });
    if (!response.success || !response.data) {
      setErrorMessage(response.message || t('action_error'));
      return;
    }
    setPasskeyToken(response.data.passkeyToken);
    setStep('passkey');
  };

  const resend = () => onSubmitEmail({ email });

  const changeEmail = () => {
    setErrorMessage(undefined);
    setStep('email');
  };

  return {
    step,
    email,
    passkeyToken,
    errorMessage,
    emailForm,
    codeForm,
    officeForm,
    signinWithDevice,
    onSubmitEmail,
    onSubmitCode,
    onSubmitOffice,
    resend,
    changeEmail,
  };
}
