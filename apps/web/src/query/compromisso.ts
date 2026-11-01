import type {
  CompromissoMotivo,
  CompromissoStatus,
  CompromissoTipo,
  CreateCompromisso,
  UpdateCompromisso,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha CompromissoRecord de apps/api/src/modules/agenda/compromisso.schema.ts.
export type CompromissoRecord = {
  id: string;
  tipo: CompromissoTipo;
  titulo: string;
  inicio: string;
  fim: string;
  local?: string;
  caseId?: string;
  caseNumber?: string;
  status: CompromissoStatus;
  origem: 'manual' | 'automatic';
  observacoes?: string;
  // Campo (AD-130, AD-131): motivo do cancelamento, coordenadas do endereço e avisos enviados.
  motivo?: CompromissoMotivo;
  coordenadas?: { lat: number; lng: number };
  avisos?: { userId: string; at: string; destinatarios: string[] }[];
};

// `from`/`to`: datas de calendário do fuso de exibição, intervalo [from, to).
export type CompromissosQueryParams = { from: string; to: string; tipo?: CompromissoTipo; caseId?: string };

export const compromissoKeys = {
  all: ['compromisso'] as const,
  lists: () => [...compromissoKeys.all, 'list'] as const,
  list: (params: CompromissosQueryParams) => [...compromissoKeys.lists(), params] as const,
  upcoming: (params: { limit: number; caseId?: string }) => [...compromissoKeys.all, 'upcoming', params] as const,
};

export const compromissosQuery = (params: CompromissosQueryParams) =>
  queryOptions({
    queryKey: compromissoKeys.list(params),
    queryFn: async (): Promise<CompromissoRecord[]> => {
      const search = new URLSearchParams({ from: params.from, to: params.to });
      if (params.tipo) search.set('tipo', params.tipo);
      if (params.caseId) search.set('caseId', params.caseId);
      const res = await get<CompromissoRecord[]>(`/agenda?${search.toString()}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const upcomingCompromissosQuery = (params: { limit: number; caseId?: string }) =>
  queryOptions({
    queryKey: compromissoKeys.upcoming(params),
    queryFn: async (): Promise<CompromissoRecord[]> => {
      const search = new URLSearchParams({ limit: String(params.limit) });
      if (params.caseId) search.set('caseId', params.caseId);
      const res = await get<CompromissoRecord[]>(`/agenda/upcoming?${search.toString()}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const createCompromissoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CompromissoRecord, Error, CreateCompromisso> => ({
  mutationFn: async (data) => {
    const res = await post<CompromissoRecord>('/agenda', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: compromissoKeys.all }),
});

export const updateCompromissoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CompromissoRecord, Error, { id: string; data: UpdateCompromisso }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<CompromissoRecord>(`/agenda/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: compromissoKeys.all }),
});

export const deleteCompromissoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/agenda/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: compromissoKeys.all }),
});
