import type { CreateDeadline, DeadlineStatus, UpdateDeadline } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { caseKeys } from './case.js';

// Espelha PrazoRecord de apps/api/src/modules/pericia/prazo.schema.ts. Datas `YYYY-MM-DD`.
export type DeadlineRecord = {
  id: string;
  caseId: string;
  caseNumber?: string;
  titulo: string;
  dueDate: string;
  status: DeadlineStatus;
  filedDate?: string;
  observacoes?: string;
};

export const deadlineKeys = {
  all: ['deadline'] as const,
  ofCase: (caseId: string) => [...deadlineKeys.all, 'legalCase', caseId] as const,
  pending: (range: { from: string; to: string }) => [...deadlineKeys.all, 'pending', range] as const,
};

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

// Calendário da agenda: pendentes que vencem em [from, to).
export const pendingDeadlinesQuery = (range: { from: string; to: string }) =>
  queryOptions({
    queryKey: deadlineKeys.pending(range),
    queryFn: () => fetchData<DeadlineRecord[]>(`/expert-cases/deadlines?from=${range.from}&to=${range.to}`),
  });

// Prazo muda o "próximo prazo" da listagem e a faixa de indicadores das perícias.
const refreshDeadlines = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
  queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
  queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
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
