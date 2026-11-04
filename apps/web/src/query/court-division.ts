import type {
  BrazilianState,
  CourtDivisionCsvColumn,
  CourtType,
  CreateCourtDivision,
  UpdateCourtDivision,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post, sendFile } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Mirrors CourtDivisionRecord of apps/api/src/modules/case/court-division.schema.ts (AD-151).
export type CourtDivisionRecord = {
  id: string;
  courtType: CourtType;
  name: string;
  court?: string;
  state: BrazilianState;
  city: string;
  address?: string;
  phones?: string;
  email?: string;
  virtualDesk?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CourtDivisionsQueryParams = { state?: BrazilianState; city?: string; courtType?: CourtType };

export type CourtDivisionImportResult = {
  created: number;
  skipped: { line: number; name: string }[];
  rejected: { line: number; column?: CourtDivisionCsvColumn; reason: string }[];
};

export const courtDivisionKeys = {
  all: ['courtDivision'] as const,
  lists: () => [...courtDivisionKeys.all, 'list'] as const,
  list: (params: CourtDivisionsQueryParams) => [...courtDivisionKeys.lists(), params] as const,
  cities: (state: string) => [...courtDivisionKeys.all, 'cities', state] as const,
};

const unwrap = <T>(res: { success: boolean; data?: T; message?: string }, fallback: string): T => {
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t(fallback));
  return res.data;
};

export const courtDivisionsQuery = (params: CourtDivisionsQueryParams = {}) =>
  queryOptions({
    queryKey: courtDivisionKeys.list(params),
    queryFn: async () => {
      const search = new URLSearchParams(
        Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
      ).toString();
      return unwrap(await get<CourtDivisionRecord[]>(`/court-divisions${search ? `?${search}` : ''}`), 'load_error');
    },
  });

export const courtDivisionCitiesQuery = (state: BrazilianState) =>
  queryOptions({
    queryKey: courtDivisionKeys.cities(state),
    queryFn: async () => unwrap(await get<string[]>(`/court-divisions/cities?state=${state}`), 'load_error'),
  });

const refresh = (queryClient: QueryClient) => queryClient.invalidateQueries({ queryKey: courtDivisionKeys.all });

export const createCourtDivisionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CourtDivisionRecord, Error, CreateCourtDivision> => ({
  mutationFn: async (data) => unwrap(await post<CourtDivisionRecord>('/court-divisions', data), 'create_error'),
  onSuccess: () => refresh(queryClient),
});

export const updateCourtDivisionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CourtDivisionRecord, Error, { id: string; data: UpdateCourtDivision }> => ({
  mutationFn: async ({ id, data }) =>
    unwrap(await patch<CourtDivisionRecord>(`/court-divisions/${id}`, data), 'save_error'),
  onSuccess: () => refresh(queryClient),
});

export const deleteCourtDivisionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/court-divisions/${id}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => refresh(queryClient),
});

export const importCourtDivisionsMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CourtDivisionImportResult, Error, File> => ({
  mutationFn: async (file) =>
    unwrap(await sendFile<CourtDivisionImportResult>('/court-divisions/import', file, 'text/csv'), 'action_error'),
  onSuccess: () => refresh(queryClient),
});
