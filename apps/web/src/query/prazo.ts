import type { CreatePrazo, PrazoStatus, UpdatePrazo } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { periciaKeys } from './pericia.js';

// Espelha PrazoRecord de apps/api/src/modules/pericia/prazo.schema.ts. Datas `YYYY-MM-DD`.
export type PrazoRecord = {
  id: string;
  periciaId: string;
  periciaNumero?: string;
  titulo: string;
  vencimento: string;
  status: PrazoStatus;
  protocoladoEm?: string;
  observacoes?: string;
};

export const prazoKeys = {
  all: ['prazo'] as const,
  daPericia: (periciaId: string) => [...prazoKeys.all, 'pericia', periciaId] as const,
  pendentes: (range: { from: string; to: string }) => [...prazoKeys.all, 'pendentes', range] as const,
};

const fetchData = async <T>(path: string): Promise<T> => {
  const res = await get<T>(path);
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t('load_error'));
  return res.data;
};

export const prazosDaPericiaQuery = (periciaId: string) =>
  queryOptions({
    queryKey: prazoKeys.daPericia(periciaId),
    queryFn: () => fetchData<PrazoRecord[]>(`/expert-cases/${encodeURIComponent(periciaId)}/deadlines`),
  });

// Calendário da agenda: pendentes que vencem em [from, to).
export const prazosPendentesQuery = (range: { from: string; to: string }) =>
  queryOptions({
    queryKey: prazoKeys.pendentes(range),
    queryFn: () => fetchData<PrazoRecord[]>(`/expert-cases/deadlines?from=${range.from}&to=${range.to}`),
  });

// Prazo muda o "próximo prazo" da listagem e a faixa de indicadores das perícias.
const refreshPrazos = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: prazoKeys.all });
  queryClient.invalidateQueries({ queryKey: periciaKeys.lists() });
  queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
};

export const createPrazoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PrazoRecord, Error, { periciaId: string; data: CreatePrazo }> => ({
  mutationFn: async ({ periciaId, data }) => {
    const res = await post<PrazoRecord>(`/expert-cases/${encodeURIComponent(periciaId)}/deadlines`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => refreshPrazos(queryClient),
});

export const updatePrazoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PrazoRecord, Error, { id: string; data: UpdatePrazo }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<PrazoRecord>(`/expert-cases/deadlines/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => refreshPrazos(queryClient),
});

export const deletePrazoMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-cases/deadlines/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => refreshPrazos(queryClient),
});
