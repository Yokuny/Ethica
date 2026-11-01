import type {
  CasePhase,
  CaseRole,
  CaseState,
  CaseStatus,
  CourtType,
  CreateCase,
  CreateMovement,
  MovementType,
  PartyType,
  Side,
  UpdateCase,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha PericiaRecord de apps/api/src/modules/pericia/pericia.schema.ts — a
// verdade fica no back-end. Datas de calendário chegam `YYYY-MM-DD`; instantes, ISO.
export type CaseRecord = {
  id: string;
  processNumber: string;
  courtType: CourtType;
  role: CaseRole;
  court: string;
  division?: string;
  district?: string;
  subject: string;
  // Cópia de tipo e nome do cadastro de partes (AD-117).
  parties: { partyId: string; side: Side; tipo: PartyType; nome: string; client?: boolean }[];
  status: CaseStatus;
  // Fase detalhada e situação derivada no servidor (AD-133).
  phase?: CasePhase;
  state: CaseState;
  nominationDate?: string;
  proposedFeesCents?: number;
  fixedFeesCents?: number;
  observacoes?: string;
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
  claimantJob?: string;
  nonPrescribedPeriodStart?: string;
  nonPrescribedPeriodEnd?: string;
  location?: string;
  // Movimentações que contam para a perícia parada (AD-121), da mais recente para a mais antiga.
  movements: { id: string; tipo: MovementType; data: string; observacoes?: string }[];
  oportunidadeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CasesQueryParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: CaseStatus;
  state?: CaseState;
  phase?: CasePhase;
  courtType?: CourtType;
};

// Listagem: cada perícia com o prazo pendente mais próximo (AD-109), ausente se não há.
export type CaseListItem = CaseRecord & { nextDeadline?: { titulo: string; dueDate: string } };

export type CasesListResult = { items: CaseListItem[]; total: number };

export type CaseDistribution = {
  status: { key: string; count: number }[];
  courtType: { key: string; count: number }[];
};

export const caseKeys = {
  all: ['legalCase'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (params: CasesQueryParams) => [...caseKeys.lists(), params] as const,
  detail: (id: string) => [...caseKeys.all, 'detail', id] as const,
  distribution: () => [...caseKeys.all, 'distribution'] as const,
};

const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') search.set(key, String(value));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

// Listagem server-driven: página, busca e filtros vão na query, nunca slice em memória.
export const casesQuery = (params: CasesQueryParams = {}) =>
  queryOptions({
    queryKey: caseKeys.list(params),
    queryFn: async (): Promise<CasesListResult> => {
      const res = await get<CasesListResult>(`/expert-cases${toQueryString(params)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const caseQuery = (id: string) =>
  queryOptions({
    queryKey: caseKeys.detail(id),
    queryFn: async (): Promise<CaseRecord> => {
      const res = await get<CaseRecord>(`/expert-cases/${encodeURIComponent(id)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const caseDistributionQuery = queryOptions({
  queryKey: caseKeys.distribution(),
  queryFn: async (): Promise<CaseDistribution> => {
    const res = await get<CaseDistribution>('/expert-cases/distribution');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const createCaseMutation = (queryClient: QueryClient): UseMutationOptions<CaseRecord, Error, CreateCase> => ({
  mutationFn: async (data) => {
    const res = await post<CaseRecord>('/expert-cases', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: caseKeys.all });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
  },
});

export const updateCaseMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CaseRecord, Error, { id: string; data: UpdateCase }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<CaseRecord>(`/expert-cases/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (updated) => {
    queryClient.setQueryData(caseKeys.detail(updated.id), updated);
    queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
    queryClient.invalidateQueries({ queryKey: caseKeys.distribution() });
  },
});

export const deleteCaseMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-cases/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: caseKeys.all }),
});

export const addMovementMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CaseRecord, Error, { caseId: string; data: CreateMovement }> => ({
  mutationFn: async ({ caseId, data }) => {
    const res = await post<CaseRecord>(`/expert-cases/${encodeURIComponent(caseId)}/movements`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: (updated) => queryClient.setQueryData(caseKeys.detail(updated.id), updated),
});

export const removeMovementMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CaseRecord, Error, { caseId: string; movementId: string }> => ({
  mutationFn: async ({ caseId, movementId }) => {
    const res = await del<CaseRecord>(
      `/expert-cases/${encodeURIComponent(caseId)}/movements/${encodeURIComponent(movementId)}`,
    );
    if (!res.success || !res.data) throw new Error(res.message ?? t('remove_error'));
    return res.data;
  },
  onSuccess: (updated) => queryClient.setQueryData(caseKeys.detail(updated.id), updated),
});

// Bloco "Perícias paradas" do início (GES-05): mesma regra do PDF (AD-121), sem as suspensas.
export type StalledCase = {
  id: string;
  processNumber: string;
  status: CaseStatus;
  subject: string;
  referencia: string;
  stalledDays: number;
};
export type StalledCases = { total: number; items: StalledCase[] };

export const stalledCasesQuery = queryOptions({
  queryKey: [...caseKeys.all, 'stalled'] as const,
  queryFn: async (): Promise<StalledCases> => {
    const res = await get<StalledCases>('/expert-cases/stalled');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});
