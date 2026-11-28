import type {
  CreateNotification,
  DatedNotificationRecord,
  NotificationKind,
  NotificationRecord,
  NotificationState,
  UpdateNotification,
} from '@ethica/contracts';
import { isDatedNotification } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { caseKeys } from './case.js';

export type { DatedNotificationRecord, NotificationRecord };

export type NotificationsQueryParams = {
  page?: number;
  limit?: number;
  state?: NotificationState;
  kind?: NotificationKind[];
  caseId?: string;
  from?: string;
  to?: string;
};

export const notificationKeys = {
  all: ['notification'] as const,
  list: (params: NotificationsQueryParams) => [...notificationKeys.all, 'list', params] as const,
  count: () => [...notificationKeys.all, 'count'] as const,
};

// `counts`: how many open and resolved with the same filters, beside each tab.
type NotificationPage = { items: NotificationRecord[]; total: number; counts: Record<NotificationState, number> };

const fetchData = async <T>(path: string): Promise<T> => {
  const res = await get<T>(path);
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t('load_error'));
  return res.data;
};

// One list for every kind (AD-282): the open ones by default; `caseId` alone gives every one of the case.
export const notificationsQuery = (params: NotificationsQueryParams) =>
  queryOptions({
    queryKey: notificationKeys.list(params),
    queryFn: () => {
      const search = new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          value === undefined ? [] : [value].flat().map((item) => [key, String(item)]),
        ),
      );
      return fetchData<NotificationPage>(`/notifications?${search}`);
    },
  });

// Every deadline and alert of the case, by due date (the case detail and the agenda).
export const caseNotificationsQuery = (caseId: string) =>
  queryOptions({
    ...notificationsQuery({ caseId, kind: ['deadline', 'alert'], limit: 100 }),
    select: (page): DatedNotificationRecord[] => page.items.filter(isDatedNotification),
  });

// The number of the menu: the open ones that already reached their day. The worker creates notices in the background.
export const notificationCountQuery = queryOptions({
  queryKey: notificationKeys.count(),
  queryFn: async () => (await fetchData<{ count: number }>('/notifications/count')).count,
  refetchInterval: 60_000,
});

// A deadline changes the listing's "next deadline", the cases indicator strip and its agenda entry.
const refreshNotifications = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
  queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
  queryClient.invalidateQueries({ queryKey: ['calendar-entry'] });
};

export const createNotificationMutation = (
  queryClient: QueryClient,
): UseMutationOptions<DatedNotificationRecord, Error, CreateNotification> => ({
  mutationFn: async (data) => {
    const res = await post<DatedNotificationRecord>('/notifications', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => refreshNotifications(queryClient),
});

export const updateNotificationMutation = (
  queryClient: QueryClient,
): UseMutationOptions<DatedNotificationRecord, Error, { id: string; data: UpdateNotification }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<DatedNotificationRecord>(`/notifications/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => refreshNotifications(queryClient),
});

export const deleteNotificationMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/notifications/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => refreshNotifications(queryClient),
});

// Read is per person, one notice at a time.
export const markReadMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await post<never>(`/notifications/${encodeURIComponent(id)}/read`, {});
    if (!res.success) throw new Error(res.message ?? t('save_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
});

// Accepting changes the case (phase or status): the case screens, the lists and the agenda read it anew.
export const decideSuggestionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<
  NotificationRecord,
  Error,
  { id: string; decision: 'accept' | 'reject'; data?: Record<string, unknown> }
> => ({
  mutationFn: async ({ id, decision, data }) => {
    const res = await post<NotificationRecord>(`/notifications/${encodeURIComponent(id)}/${decision}`, data ?? {});
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    queryClient.invalidateQueries({ queryKey: caseKeys.all });
    queryClient.invalidateQueries({ queryKey: ['transaction'] });
  },
});
