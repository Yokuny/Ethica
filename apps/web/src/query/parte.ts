import type { CreateParte, ParteTipo, UpdateParte } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { type PericiaRecord, periciaKeys } from './pericia.js';

// Espelha ParteRecord de apps/api/src/modules/pericia/parte.schema.ts (AD-117).
export type ParteRecord = {
  id: string;
  tipo: ParteTipo;
  nome: string;
  documento?: string;
  oab?: string;
  email?: string;
  telefone?: string;
  createdAt: string;
  updatedAt: string;
};

export type PartesQueryParams = { page?: number; limit?: number; q?: string; tipo?: ParteTipo };
export type PartesListResult = { items: ParteRecord[]; total: number };

export const parteKeys = {
  all: ['parte'] as const,
  lists: () => [...parteKeys.all, 'list'] as const,
  list: (params: PartesQueryParams) => [...parteKeys.lists(), params] as const,
  detail: (id: string) => [...parteKeys.all, 'detail', id] as const,
  pericias: (id: string) => [...parteKeys.all, 'pericias', id] as const,
};

const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') search.set(key, String(value));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const partesQuery = (params: PartesQueryParams = {}) =>
  queryOptions({
    queryKey: parteKeys.list(params),
    queryFn: async (): Promise<PartesListResult> => {
      const res = await get<PartesListResult>(`/partes${toQueryString(params)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const parteQuery = (id: string) =>
  queryOptions({
    queryKey: parteKeys.detail(id),
    queryFn: async (): Promise<ParteRecord> => {
      const res = await get<ParteRecord>(`/partes/${encodeURIComponent(id)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const parteProcessosQuery = (id: string) =>
  queryOptions({
    queryKey: parteKeys.pericias(id),
    queryFn: async (): Promise<PericiaRecord[]> => {
      const res = await get<PericiaRecord[]>(`/partes/${encodeURIComponent(id)}/pericias`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const createParteMutation = (queryClient: QueryClient): UseMutationOptions<ParteRecord, Error, CreateParte> => ({
  mutationFn: async (data) => {
    const res = await post<ParteRecord>('/partes', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: parteKeys.lists() }),
});

// Renomear atualiza a cópia do nome nas perícias (AD-117): as perícias são recarregadas.
export const updateParteMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ParteRecord, Error, { id: string; data: UpdateParte }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<ParteRecord>(`/partes/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (updated) => {
    queryClient.setQueryData(parteKeys.detail(updated.id), updated);
    queryClient.invalidateQueries({ queryKey: parteKeys.lists() });
    queryClient.invalidateQueries({ queryKey: parteKeys.pericias(updated.id) });
    queryClient.invalidateQueries({ queryKey: periciaKeys.all });
  },
});
