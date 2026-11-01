import type { ChangePassword, UpdateProfile } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { apiUrl, del, get, patch, post, put } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { sessionKeys } from '@/query/session.js';
import { userKeys } from '@/query/user.js';

// Mirrors AccountView of apps/api/src/modules/identity/account.schema.ts.
export type AccountView = {
  name: string;
  avatar?: string;
  cpf?: string;
  professionalRegistration?: string;
  education?: string;
};

// Name and photo show up in the menu (session), in the assignees (usersQuery) and in the
// directory (under userKeys.all): everything is reloaded after a change.
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

// `image` is the data URL already shrunk in the browser; `null` removes the photo.
export const setAvatarMutation = (queryClient: QueryClient): UseMutationOptions<AccountView, Error, string | null> => ({
  mutationFn: async (image) => {
    const res = image ? await put<AccountView>('/me/avatar', { image }) : await del<AccountView>('/me/avatar');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => refreshAccount(queryClient),
});

export const accountKeys = {
  profile: ['account', 'profile'] as const,
  calendarFeed: ['account', 'calendar-feed'] as const,
};

// DOC-01: name and professional data (CPF, registration, education) that go on the documents.
export const profileQuery = queryOptions({
  queryKey: accountKeys.profile,
  queryFn: async (): Promise<AccountView> => {
    const res = await get<AccountView>('/me/profile');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

// PRZ-03: we only know whether the link exists; the token shows up only once, when generated.
export const calendarFeedQuery = queryOptions({
  queryKey: accountKeys.calendarFeed,
  queryFn: async (): Promise<{ active: boolean }> => {
    const res = await get<{ active: boolean }>('/me/calendar-feed');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

// The external calendar fetches the feed from outside the browser: the URL has to be absolute.
export const calendarFeedUrl = (token: string): string =>
  new URL(apiUrl(`/agenda/feed/${token}.ics`), window.location.origin).href;

export const generateCalendarFeedMutation = (queryClient: QueryClient): UseMutationOptions<string, Error, void> => ({
  mutationFn: async () => {
    const res = await post<{ token: string }>('/me/calendar-feed', {});
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return calendarFeedUrl(res.data.token);
  },
  onSuccess: () => queryClient.setQueryData(accountKeys.calendarFeed, { active: true }),
});

export const revokeCalendarFeedMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, void> => ({
  mutationFn: async () => {
    const res = await del('/me/calendar-feed');
    if (!res.success) throw new Error(res.message ?? t('action_error'));
  },
  onSuccess: () => queryClient.setQueryData(accountKeys.calendarFeed, { active: false }),
});
