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

// Mirrors CaseRecord of apps/api/src/modules/case/case.schema.ts — the
// truth lives in the back-end. Calendar dates arrive as `YYYY-MM-DD`; instants, ISO.
export type CaseRecord = {
  id: string;
  processNumber: string;
  courtType: CourtType;
  role: CaseRole;
  court: string;
  division?: string;
  district?: string;
  subject: string;
  // Type and name copy from the party registry (AD-117).
  parties: { partyId: string; side: Side; type: PartyType; name: string; client?: boolean }[];
  status: CaseStatus;
  // Detailed phase and state derived on the server (AD-133).
  phase?: CasePhase;
  state: CaseState;
  nominationDate?: string;
  proposedFeesCents?: number;
  fixedFeesCents?: number;
  notes?: string;
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
  claimantJob?: string;
  nonPrescribedPeriodStart?: string;
  nonPrescribedPeriodEnd?: string;
  location?: string;
  // Movements that count for the stalled case (AD-121), from newest to oldest.
  movements: { id: string; type: MovementType; data: string; notes?: string }[];
  opportunityId?: string;
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

// Listing: each case with its nearest pending deadline (AD-109), missing if there is none.
export type CaseListItem = CaseRecord & { nextDeadline?: { title: string; dueDate: string } };

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

// Server-driven listing: page, search and filters go in the query, never an in-memory slice.
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

// Home "Stalled cases" block (GES-05): same rule as the PDF (AD-121), without the suspended ones.
export type StalledCase = {
  id: string;
  processNumber: string;
  status: CaseStatus;
  subject: string;
  reference: string;
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
