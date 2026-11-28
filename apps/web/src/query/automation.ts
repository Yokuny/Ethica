import type {
  AutomationDashboard,
  CourtLookup,
  CourtProcessView,
  SortOrder,
  TrackedCaseSort,
  TrackedCaseStatus,
  TrackedCasesList,
} from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Automação Datajud (AD-270): what the worker brought from the court for the case; null until the first query.
export const automationKeys = {
  all: ['automation'] as const,
  courtProcess: (caseId: string) => [...automationKeys.all, 'court-process', caseId] as const,
  dashboard: () => [...automationKeys.all, 'dashboard'] as const,
  cases: (params: TrackedCasesParams) => [...automationKeys.all, 'cases', params] as const,
};

export type TrackedCasesParams = {
  page?: number;
  limit?: number;
  q?: string;
  state?: TrackedCaseStatus[];
  sort?: TrackedCaseSort;
  order?: SortOrder;
};

// A list filter repeats the key (`state=a&state=b`, FIL-03).
const toQueryString = (params: Record<string, string | number | string[] | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    for (const item of [value ?? []].flat()) if (item !== '') search.append(key, String(item));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const courtProcessQuery = (caseId: string) =>
  queryOptions({
    queryKey: automationKeys.courtProcess(caseId),
    queryFn: async (): Promise<CourtProcessView | null> => {
      const res = await get<CourtProcessView | null>(`/automation/cases/${encodeURIComponent(caseId)}/court-process`);
      if (!res.success) throw new Error(res.message ?? t('load_error'));
      return res.data ?? null;
    },
  });

// The cases followed in court (PAT-03), filtered, sorted and paginated by the API; without a sort, the newest
// movement first.
export const trackedCasesQuery = (params: TrackedCasesParams = {}) =>
  queryOptions({
    queryKey: automationKeys.cases(params),
    queryFn: async (): Promise<TrackedCasesList> => {
      const res = await get<TrackedCasesList>(`/automation/cases${toQueryString(params)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

// The Automação panel (PAT-01, PAT-04, PAT-05): 25 months of what the automation did, the screen cuts the period.
export const automationDashboardQuery = queryOptions({
  queryKey: automationKeys.dashboard(),
  queryFn: async (): Promise<AutomationDashboard> => {
    const res = await get<AutomationDashboard>('/automation/dashboard');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

// Fill a case by its number, live (SGD-06): the API answers from the copy of the day or asks the court once.
export const lookupCourtProcess = async (processNumber: string): Promise<CourtLookup> => {
  const res = await get<CourtLookup>(`/automation/court-lookup?processNumber=${encodeURIComponent(processNumber)}`);
  if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
  return res.data;
};
