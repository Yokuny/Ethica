import type { CaseRole } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseKeys } from '@/query/case.js';
import { transactionKeys } from '@/query/transaction.js';

// Mirror CaseDashboard and FeesDashboard of the API (DSH-02 to 05): one per permission (AD-137).
export type CaseDashboard = {
  total: number;
  closed: number;
  byType: { role: CaseRole; serviceType?: string; count: number }[];
  courtExpertByYear: { year: string; count: number }[];
};

export type FeesDashboard = {
  receivableCents: number;
  receivedByYear: { year: string; cents: number }[];
};

const fetchData = async <T>(path: string): Promise<T> => {
  const res = await get<T>(path);
  if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
  return res.data;
};

// Under the entity keys, so a saved service or receipt refreshes the numbers.
export const caseDashboardQuery = queryOptions({
  queryKey: [...caseKeys.all, 'dashboard'],
  queryFn: () => fetchData<CaseDashboard>('/expert-cases/dashboard'),
});

export const feesDashboardQuery = queryOptions({
  queryKey: [...transactionKeys.all, 'dashboard'],
  queryFn: () => fetchData<FeesDashboard>('/finance/dashboard'),
});
