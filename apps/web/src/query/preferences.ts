import type { HomeBloco } from '@ethica/contracts';
import { type QueryClient, queryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { get, patch } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha UserPreferences de apps/api/src/modules/identity/preferences.schema.ts: aviso de
// prazos (AD-110, na conta) e blocos ocultos do início (AD-136).
export type UserPreferences = {
  onboardingDismissed: boolean;
  deadlineReminderEmail: boolean;
  blocosOcultos: HomeBloco[];
};

export const preferencesKeys = { all: ['preferences'] as const };

export const preferencesQuery = queryOptions({
  queryKey: preferencesKeys.all,
  queryFn: async (): Promise<UserPreferences> => {
    const res = await get<UserPreferences>('/me/preferences');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const updatePreferencesMutation = (
  queryClient: QueryClient,
): UseMutationOptions<UserPreferences, Error, Partial<UserPreferences>> => ({
  mutationFn: async (data) => {
    const res = await patch<UserPreferences>('/me/preferences', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (data) => queryClient.setQueryData(preferencesKeys.all, data),
});
