import type { ChangePassword, UpdateProfile } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { apiUrl, del, get, patch, post, put } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { sessionKeys } from '@/query/session.js';
import { userKeys } from '@/query/user.js';

// Espelha AccountView de apps/api/src/modules/identity/account.schema.ts.
export type AccountView = {
  name: string;
  avatar?: string;
  cpf?: string;
  registroProfissional?: string;
  formacao?: string;
};

// Nome e foto aparecem no menu (sessão), nos responsáveis (usersQuery) e no
// diretório (sob userKeys.all): tudo é recarregado depois de mudar.
const refreshAccount = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
  queryClient.invalidateQueries({ queryKey: userKeys.all });
};

export const updateProfileMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AccountView, Error, UpdateProfile> => ({
  mutationFn: async (data) => {
    const res = await patch<AccountView>('/me/profile', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => refreshAccount(queryClient),
});

export const changePasswordMutation = (): UseMutationOptions<void, Error, ChangePassword> => ({
  mutationFn: async (data) => {
    const res = await put('/me/password', data);
    if (!res.success) throw new Error(res.message ?? t('action_error'));
  },
});

// `image` é a data URL já reduzida no navegador; `null` remove a foto.
export const setAvatarMutation = (queryClient: QueryClient): UseMutationOptions<AccountView, Error, string | null> => ({
  mutationFn: async (image) => {
    const res = image ? await put<AccountView>('/me/avatar', { image }) : await del<AccountView>('/me/avatar');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => refreshAccount(queryClient),
});

// Espelha UserPreferences de apps/api/src/modules/identity/preferences.schema.ts (AD-110).
export type AccountPreferences = { onboardingDismissed: boolean; avisoPrazoEmail: boolean };

export const accountKeys = {
  profile: ['account', 'profile'] as const,
  preferences: ['account', 'preferences'] as const,
  calendarFeed: ['account', 'calendar-feed'] as const,
};

// DOC-01: nome e dados profissionais (CPF, registro, formação) que vão nos documentos.
export const profileQuery = queryOptions({
  queryKey: accountKeys.profile,
  queryFn: async (): Promise<AccountView> => {
    const res = await get<AccountView>('/me/profile');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const preferencesQuery = queryOptions({
  queryKey: accountKeys.preferences,
  queryFn: async (): Promise<AccountPreferences> => {
    const res = await get<AccountPreferences>('/me/preferences');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const updatePreferencesMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AccountPreferences, Error, Partial<AccountPreferences>> => ({
  mutationFn: async (data) => {
    const res = await patch<AccountPreferences>('/me/preferences', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (data) => queryClient.setQueryData(accountKeys.preferences, data),
});

// PRZ-03: só se sabe se o link existe; o token aparece uma única vez, ao gerar.
export const calendarFeedQuery = queryOptions({
  queryKey: accountKeys.calendarFeed,
  queryFn: async (): Promise<{ active: boolean }> => {
    const res = await get<{ active: boolean }>('/me/calendar-feed');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

// O calendário externo busca o feed de fora do navegador: a URL precisa ser absoluta.
export const calendarFeedUrl = (token: string): string =>
  new URL(apiUrl(`/agenda/feed/${token}.ics`), window.location.origin).href;

export const gerarCalendarFeedMutation = (queryClient: QueryClient): UseMutationOptions<string, Error, void> => ({
  mutationFn: async () => {
    const res = await post<{ token: string }>('/me/calendar-feed', {});
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return calendarFeedUrl(res.data.token);
  },
  onSuccess: () => queryClient.setQueryData(accountKeys.calendarFeed, { active: true }),
});

export const revogarCalendarFeedMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, void> => ({
  mutationFn: async () => {
    const res = await del('/me/calendar-feed');
    if (!res.success) throw new Error(res.message ?? t('action_error'));
  },
  onSuccess: () => queryClient.setQueryData(accountKeys.calendarFeed, { active: false }),
});
