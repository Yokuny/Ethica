import type {
  CaseRole,
  CourtType,
  CreateDeadline,
  DeadlineKind,
  DeadlineStatus,
  UpdateDeadline,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { caseKeys } from './case.js';

// Mirrors DeadlineRecord of apps/api/src/modules/case/deadline.schema.ts. Dates `YYYY-MM-DD`.
export type DeadlineRecord = {
  id: string;
  caseId: string;
  caseNumber?: string;
  client?: string;
  plaintiff?: string;
  defendant?: string;
  role?: CaseRole;
  serviceType?: string;
  courtType?: CourtType;
  kind: DeadlineKind;
  title: string;
  dueDate: string;
  status: DeadlineStatus;
  filedDate?: string;
  notes?: string;
};

export const deadlineKeys = {
  all: ['deadline'] as const,
  ofCase: (caseId: string) => [...deadlineKeys.all, 'legalCase', caseId] as const,
  list: (params: DeadlinesQueryParams) => [...deadlineKeys.all, 'list', params] as const,
};

export type DeadlinesQueryParams = { page: number; limit: number; status: DeadlineStatus };

const fetchData = async <T>(path: string): Promise<T> => {
  const res = await get<T>(path);
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t('load_error'));
  return res.data;
};

export const caseDeadlinesQuery = (caseId: string) =>
  queryOptions({
    queryKey: deadlineKeys.ofCase(caseId),
    queryFn: () => fetchData<DeadlineRecord[]>(`/expert-cases/${encodeURIComponent(caseId)}/deadlines`),
  });

// "Prazos e Alertas" (AD-189): every case's, one situation at a time, by criticality.
export const deadlinesQuery = (params: DeadlinesQueryParams) =>
  queryOptions({
    queryKey: deadlineKeys.list(params),
    queryFn: () =>
      fetchData<{ items: DeadlineRecord[]; total: number }>(
        `/expert-cases/deadlines?page=${params.page}&limit=${params.limit}&status=${params.status}`,
      ),
  });

// A deadline changes the listing's "next deadline", the cases indicator strip and its agenda entry.
const refreshDeadlines = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
  queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
  queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
  queryClient.invalidateQueries({ queryKey: ['calendar-entry'] });
};

export const createDeadlineMutation = (
  queryClient: QueryClient,
): UseMutationOptions<DeadlineRecord, Error, { caseId: string; data: CreateDeadline }> => ({
  mutationFn: async ({ caseId, data }) => {
    const res = await post<DeadlineRecord>(`/expert-cases/${encodeURIComponent(caseId)}/deadlines`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => refreshDeadlines(queryClient),
});

export const updateDeadlineMutation = (
  queryClient: QueryClient,
): UseMutationOptions<DeadlineRecord, Error, { id: string; data: UpdateDeadline }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<DeadlineRecord>(`/expert-cases/deadlines/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => refreshDeadlines(queryClient),
});

export const deleteDeadlineMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-cases/deadlines/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => refreshDeadlines(queryClient),
});
