import type { CaseRole } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseKeys } from '@/query/case.js';
import { transactionKeys } from '@/query/transaction.js';

// Mirror of the API's CaseDashboard and FeesDashboard (DSH-02 to 05). `byMonth` brings 25 months: two 12-month
// periods of complete months and the month in progress.
export type CaseDashboard = {
  total: number;
  closed: number;
  byType: { role: CaseRole; serviceType?: string; count: number }[];
  // Each month with its total and the same count split by type.
  byMonth: { month: string; count: number; byType: { role: CaseRole; serviceType?: string; count: number }[] }[];
};

export type FeesDashboard = {
  receivableCents: number;
  receivedCents: number;
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

// Fees received since the start (DSH-02): the context of the period's received.
export const feesDashboardQuery = queryOptions({
  queryKey: [...transactionKeys.all, 'dashboard'],
  queryFn: () => fetchData<FeesDashboard>('/finance/dashboard'),
});
