import type { CreateParty, PartyType, UpdateParty } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { type CaseRecord, caseKeys } from './case.js';

// Espelha ParteRecord de apps/api/src/modules/pericia/parte.schema.ts (AD-117).
export type PartyRecord = {
  id: string;
  tipo: PartyType;
  nome: string;
  documento?: string;
  oab?: string;
  email?: string;
  telefone?: string;
  createdAt: string;
  updatedAt: string;
};

export type PartiesQueryParams = { page?: number; limit?: number; q?: string; tipo?: PartyType };
export type PartiesListResult = { items: PartyRecord[]; total: number };

export const partyKeys = {
  all: ['party'] as const,
  lists: () => [...partyKeys.all, 'list'] as const,
  list: (params: PartiesQueryParams) => [...partyKeys.lists(), params] as const,
  detail: (id: string) => [...partyKeys.all, 'detail', id] as const,
  cases: (id: string) => [...partyKeys.all, 'cases', id] as const,
};

const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') search.set(key, String(value));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const partiesQuery = (params: PartiesQueryParams = {}) =>
  queryOptions({
    queryKey: partyKeys.list(params),
    queryFn: async (): Promise<PartiesListResult> => {
      const res = await get<PartiesListResult>(`/parties${toQueryString(params)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const partyQuery = (id: string) =>
  queryOptions({
    queryKey: partyKeys.detail(id),
    queryFn: async (): Promise<PartyRecord> => {
      const res = await get<PartyRecord>(`/parties/${encodeURIComponent(id)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const partyProcessesQuery = (id: string) =>
  queryOptions({
    queryKey: partyKeys.cases(id),
    queryFn: async (): Promise<CaseRecord[]> => {
      const res = await get<CaseRecord[]>(`/parties/${encodeURIComponent(id)}/expert-cases`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const createPartyMutation = (queryClient: QueryClient): UseMutationOptions<PartyRecord, Error, CreateParty> => ({
  mutationFn: async (data) => {
    const res = await post<PartyRecord>('/parties', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.lists() }),
});

// Renomear atualiza a cópia do nome nas perícias (AD-117): as perícias são recarregadas.
export const updatePartyMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PartyRecord, Error, { id: string; data: UpdateParty }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<PartyRecord>(`/parties/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (updated) => {
    queryClient.setQueryData(partyKeys.detail(updated.id), updated);
    queryClient.invalidateQueries({ queryKey: partyKeys.lists() });
    queryClient.invalidateQueries({ queryKey: partyKeys.cases(updated.id) });
    queryClient.invalidateQueries({ queryKey: caseKeys.all });
  },
});
