import type { CreatePericia, Justica, PapelPericia, PericiaStatus, UpdatePericia } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha PericiaRecord de apps/api/src/modules/pericia/pericia.schema.ts — a
// verdade fica no back-end. Datas de calendário chegam `YYYY-MM-DD`; instantes, ISO.
export type PericiaRecord = {
  id: string;
  numeroProcesso: string;
  justica: Justica;
  papel: PapelPericia;
  tribunal: string;
  vara?: string;
  comarca?: string;
  objeto: string;
  autor?: string;
  reu?: string;
  status: PericiaStatus;
  dataNomeacao?: string;
  honorariosPropostosCents?: number;
  honorariosFixadosCents?: number;
  observacoes?: string;
  oportunidadeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PericiasQueryParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: PericiaStatus;
  justica?: Justica;
};

// Listagem: cada perícia com o prazo pendente mais próximo (AD-109), ausente se não há.
export type PericiaListItem = PericiaRecord & { proximoPrazo?: { titulo: string; vencimento: string } };

export type PericiasListResult = { items: PericiaListItem[]; total: number };

export type PericiaDistribution = {
  status: { key: string; count: number }[];
  justica: { key: string; count: number }[];
};

export const periciaKeys = {
  all: ['pericia'] as const,
  lists: () => [...periciaKeys.all, 'list'] as const,
  list: (params: PericiasQueryParams) => [...periciaKeys.lists(), params] as const,
  detail: (id: string) => [...periciaKeys.all, 'detail', id] as const,
  distribution: () => [...periciaKeys.all, 'distribution'] as const,
};

const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') search.set(key, String(value));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

// Listagem server-driven: página, busca e filtros vão na query, nunca slice em memória.
export const periciasQuery = (params: PericiasQueryParams = {}) =>
  queryOptions({
    queryKey: periciaKeys.list(params),
    queryFn: async (): Promise<PericiasListResult> => {
      const res = await get<PericiasListResult>(`/pericias${toQueryString(params)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const periciaQuery = (id: string) =>
  queryOptions({
    queryKey: periciaKeys.detail(id),
    queryFn: async (): Promise<PericiaRecord> => {
      const res = await get<PericiaRecord>(`/pericias/${encodeURIComponent(id)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const periciaDistributionQuery = queryOptions({
  queryKey: periciaKeys.distribution(),
  queryFn: async (): Promise<PericiaDistribution> => {
    const res = await get<PericiaDistribution>('/pericias/distribution');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const createPericiaMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PericiaRecord, Error, CreatePericia> => ({
  mutationFn: async (data) => {
    const res = await post<PericiaRecord>('/pericias', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: periciaKeys.all });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/pericias/stats'] });
  },
});

export const updatePericiaMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PericiaRecord, Error, { id: string; data: UpdatePericia }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<PericiaRecord>(`/pericias/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (updated) => {
    queryClient.setQueryData(periciaKeys.detail(updated.id), updated);
    queryClient.invalidateQueries({ queryKey: periciaKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/pericias/stats'] });
    queryClient.invalidateQueries({ queryKey: periciaKeys.distribution() });
  },
});

export const deletePericiaMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/pericias/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: periciaKeys.all }),
});
