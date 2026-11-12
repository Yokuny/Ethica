import type { PasskeyView } from '@ethica/contracts';
import {
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// AD-220: every session is born from the passkey of the device (WebAuthn). Each call returns the
// error message to show, or undefined when the session cookie was set.
type Options<T> = { options: T; challengeToken: string };

// The browser says the person cancelled (or the time ran out) with NotAllowedError/AbortError.
const ceremonyError = (error: unknown) =>
  error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'AbortError')
    ? t('device_confirmation_cancelled')
    : t('invalid_passkey');

// APA-03/04: after the e-mail key, the office creation or the invite.
export async function createPasskey(passkeyToken: string): Promise<string | undefined> {
  const options = await post<Options<PublicKeyCredentialCreationOptionsJSON>>('/auth/passkey/register/options', {
    passkeyToken,
  });
  if (!options.success || !options.data) return options.message || t('action_error');

  let response: RegistrationResponseJSON;
  try {
    response = await startRegistration({ optionsJSON: options.data.options });
  } catch (error) {
    return ceremonyError(error);
  }
  const res = await post('/auth/passkey/register', { challengeToken: options.data.challengeToken, response });
  return res.success ? undefined : res.message || t('action_error');
}

// APA-02: sign-in without e-mail. With `autofill`, the request waits for the person to pick the
// passkey in the e-mail field suggestions; a cancelled autofill returns nothing to show.
export async function signinWithPasskey(autofill = false): Promise<string | undefined> {
  const options = await post<Options<PublicKeyCredentialRequestOptionsJSON>>('/auth/passkey/options');
  if (!options.success || !options.data) return options.message || t('action_error');

  let response: AuthenticationResponseJSON;
  try {
    response = await startAuthentication({ optionsJSON: options.data.options, useBrowserAutofill: autofill });
  } catch (error) {
    return autofill ? undefined : ceremonyError(error);
  }
  const res = await post('/auth/passkey', { challengeToken: options.data.challengeToken, response });
  return res.success ? undefined : res.message || t('action_error');
}

// APA-08: devices with access, in the account screen.
export const passkeyKeys = { all: ['account', 'passkeys'] as const };

export const passkeysQuery = queryOptions({
  queryKey: passkeyKeys.all,
  queryFn: async (): Promise<PasskeyView[]> => {
    const res = await get<PasskeyView[]>('/me/passkeys');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

// Removing the device in use ends this session too: the next request goes back to the sign-in.
export const removePasskeyMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, string> => ({
  mutationFn: async (id) => {
    const res = await del(`/me/passkeys/${id}`);
    if (!res.success) throw new Error(res.message ?? t('action_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: passkeyKeys.all }),
});
