import type {
  CaseRole,
  CourtType,
  CreateNotification,
  NotificationModule,
  NotificationSource,
  NotificationStatus,
  UpdateNotification,
  UserNotificationKind,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { caseKeys } from './case.js';

// Mirrors DatedNotification of apps/api/src/modules/notifications/notification.schema.ts (a deadline or an
// alert, AD-263). Dates `YYYY-MM-DD`.
export type NotificationRecord = {
  id: string;
  module: NotificationModule;
  source: NotificationSource;
  caseId: string;
  caseNumber?: string;
  client?: string;
  plaintiff?: string;
  defendant?: string;
  role?: CaseRole;
  serviceType?: string;
  courtType?: CourtType;
  kind: UserNotificationKind;
  title: string;
  dueDate: string;
  status: NotificationStatus;
  filedDate?: string;
  notes?: string;
};

export const notificationKeys = {
  all: ['notification'] as const,
  ofCase: (caseId: string) => [...notificationKeys.all, 'legalCase', caseId] as const,
  list: (params: NotificationsQueryParams) => [...notificationKeys.all, 'list', params] as const,
};

export type NotificationsQueryParams = { page: number; limit: number; status: NotificationStatus };

type NotificationPage = { items: NotificationRecord[]; total: number };

const fetchData = async <T>(path: string): Promise<T> => {
  const res = await get<T>(path);
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t('load_error'));
  return res.data;
};

// Every deadline and alert of the case, by due date (the case detail).
export const caseNotificationsQuery = (caseId: string) =>
  queryOptions({
    queryKey: notificationKeys.ofCase(caseId),
    queryFn: async () =>
      (await fetchData<NotificationPage>(`/notifications?caseId=${encodeURIComponent(caseId)}&limit=100`)).items,
  });

// Central (AD-189, AD-263): every case's, one situation at a time, by criticality.
export const notificationsQuery = (params: NotificationsQueryParams) =>
  queryOptions({
    queryKey: notificationKeys.list(params),
    queryFn: () =>
      fetchData<NotificationPage>(`/notifications?page=${params.page}&limit=${params.limit}&status=${params.status}`),
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
): UseMutationOptions<NotificationRecord, Error, CreateNotification> => ({
  mutationFn: async (data) => {
    const res = await post<NotificationRecord>('/notifications', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => refreshNotifications(queryClient),
});

export const updateNotificationMutation = (
  queryClient: QueryClient,
): UseMutationOptions<NotificationRecord, Error, { id: string; data: UpdateNotification }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<NotificationRecord>(`/notifications/${encodeURIComponent(id)}`, data);
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
