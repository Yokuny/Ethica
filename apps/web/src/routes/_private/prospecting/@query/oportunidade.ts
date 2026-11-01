import type {
  CaseRole,
  CourtType,
  CreateOportunidade,
  DatajudCourt,
  DatajudSearch,
  OportunidadeStatus,
  UpdateOportunidade,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Espelha apps/api/src/modules/prospeccao/oportunidade.schema.ts e
// apps/api/src/providers/datajudClient.ts. Local à prospecção: busca e
// oportunidades são as duas únicas rotas que usam.
export type DatajudResultado = {
  processNumber: string;
  court: DatajudCourt;
  classe?: string;
  assuntos: string[];
  orgaoJulgador?: string;
  filingDate?: string;
  lastMovement?: string;
  lastMovementAt?: string;
  oportunidadeId?: string;
};

export type DatajudSearchResult = { items: DatajudResultado[]; cursor?: (string | number)[] };

export type OportunidadeRecord = Omit<DatajudResultado, 'oportunidadeId'> & {
  id: string;
  status: OportunidadeStatus;
  observacoes?: string;
  caseId?: string;
  createdAt: string;
};

export type OportunidadesListResult = { items: OportunidadeRecord[]; total: number };
export type OportunidadesQueryParams = { page: number; limit: number; status?: OportunidadeStatus };
export type ConverterOportunidade = {
  courtType: CourtType;
  role: CaseRole;
  subject: string;
  nominationDate?: string;
  reportDeadline?: string;
};

export const oportunidadeKeys = {
  all: ['oportunidade'] as const,
  lists: () => [...oportunidadeKeys.all, 'list'] as const,
  list: (params: OportunidadesQueryParams) => [...oportunidadeKeys.lists(), params] as const,
};

const invalidateAll = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: oportunidadeKeys.all });
  queryClient.invalidateQueries({ queryKey: ['list-stats', '/prospecting/opportunities/stats'] });
};

// A busca no Datajud é uma mutation (POST, com cota e rate limit): só roda quando a pessoa pede.
export const searchDatajudMutation = (): UseMutationOptions<DatajudSearchResult, Error, DatajudSearch> => ({
  mutationFn: async (query) => {
    const res = await post<DatajudSearchResult>('/prospecting/datajud/search', query);
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const oportunidadesQuery = (params: OportunidadesQueryParams) =>
  queryOptions({
    queryKey: oportunidadeKeys.list(params),
    queryFn: async (): Promise<OportunidadesListResult> => {
      const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
      if (params.status) search.set('status', params.status);
      const res = await get<OportunidadesListResult>(`/prospecting/opportunities?${search.toString()}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const createOportunidadeMutation = (
  queryClient: QueryClient,
): UseMutationOptions<OportunidadeRecord, Error, CreateOportunidade> => ({
  mutationFn: async (data) => {
    const res = await post<OportunidadeRecord>('/prospecting/opportunities', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => invalidateAll(queryClient),
});

export const updateOportunidadeMutation = (
  queryClient: QueryClient,
): UseMutationOptions<OportunidadeRecord, Error, { id: string; data: UpdateOportunidade }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<OportunidadeRecord>(`/prospecting/opportunities/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => invalidateAll(queryClient),
});

export const deleteOportunidadeMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/prospecting/opportunities/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => invalidateAll(queryClient),
});

export const converterOportunidadeMutation = (
  queryClient: QueryClient,
): UseMutationOptions<{ caseId: string }, Error, { id: string; data: ConverterOportunidade }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await post<{ caseId: string }>(`/prospecting/opportunities/${encodeURIComponent(id)}/convert`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => {
    invalidateAll(queryClient);
    queryClient.invalidateQueries({ queryKey: ['legalCase'] });
  },
});
