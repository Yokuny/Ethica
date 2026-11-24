import type {
  HomeBlock,
  NotificationChannel,
  NotificationPreferences,
  NotificationPreferenceTopic,
} from '@ethica/contracts';
import { type QueryClient, queryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { get, patch } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Mirrors UserPreferences of apps/api/src/modules/identity/preferences.schema.ts: delivery of the
// notifications by kind × channel (CNT-05, in the account) and hidden home blocks (AD-136).
export type UserPreferences = {
  onboardingDismissed: boolean;
  notifications: Record<NotificationPreferenceTopic, Record<NotificationChannel, boolean>>;
  hiddenBlocks: HomeBlock[];
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
): UseMutationOptions<
  UserPreferences,
  Error,
  Partial<Omit<UserPreferences, 'notifications'>> & { notifications?: NotificationPreferences }
> => ({
  mutationFn: async (data) => {
    const res = await patch<UserPreferences>('/me/preferences', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (data) => queryClient.setQueryData(preferencesKeys.all, data),
});
