import type {
  CaseRole,
  CourtType,
  CreateOpportunity,
  DatajudCourt,
  DatajudSearch,
  OpportunityStatus,
  UpdateOpportunity,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Espelha apps/api/src/modules/prospeccao/oportunidade.schema.ts e
// apps/api/src/providers/datajudClient.ts. Local à prospecção: busca e
// oportunidades são as duas únicas rotas que usam.
export type DatajudResult = {
  processNumber: string;
  court: DatajudCourt;
  caseClass?: string;
  subjects: string[];
  courtUnit?: string;
  filingDate?: string;
  lastMovement?: string;
  lastMovementAt?: string;
  opportunityId?: string;
};

export type DatajudSearchResult = { items: DatajudResult[]; cursor?: (string | number)[] };

export type OpportunityRecord = Omit<DatajudResult, 'opportunityId'> & {
  id: string;
  status: OpportunityStatus;
  notes?: string;
  caseId?: string;
  createdAt: string;
};

export type OpportunitiesListResult = { items: OpportunityRecord[]; total: number };
export type OpportunitiesQueryParams = { page: number; limit: number; status?: OpportunityStatus };
export type ConvertOpportunity = {
  courtType: CourtType;
  role: CaseRole;
  subject: string;
  nominationDate?: string;
  reportDeadline?: string;
};

export const opportunityKeys = {
  all: ['opportunity'] as const,
  lists: () => [...opportunityKeys.all, 'list'] as const,
  list: (params: OpportunitiesQueryParams) => [...opportunityKeys.lists(), params] as const,
};

const invalidateAll = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
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

export const opportunitiesQuery = (params: OpportunitiesQueryParams) =>
  queryOptions({
    queryKey: opportunityKeys.list(params),
    queryFn: async (): Promise<OpportunitiesListResult> => {
      const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
      if (params.status) search.set('status', params.status);
      const res = await get<OpportunitiesListResult>(`/prospecting/opportunities?${search.toString()}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const createOpportunityMutation = (
  queryClient: QueryClient,
): UseMutationOptions<OpportunityRecord, Error, CreateOpportunity> => ({
  mutationFn: async (data) => {
    const res = await post<OpportunityRecord>('/prospecting/opportunities', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => invalidateAll(queryClient),
});

export const updateOpportunityMutation = (
  queryClient: QueryClient,
): UseMutationOptions<OpportunityRecord, Error, { id: string; data: UpdateOpportunity }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<OpportunityRecord>(`/prospecting/opportunities/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => invalidateAll(queryClient),
});

export const deleteOpportunityMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/prospecting/opportunities/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => invalidateAll(queryClient),
});

export const convertOpportunityMutation = (
  queryClient: QueryClient,
): UseMutationOptions<{ caseId: string }, Error, { id: string; data: ConvertOpportunity }> => ({
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
