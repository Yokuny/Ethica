import type {
  CreateInstallment,
  CreateTransaction,
  SortOrder,
  TransactionCategory,
  TransactionKind,
  TransactionListSort,
  TransactionStatus,
  UpdateTransaction,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Mirrors the types of apps/api/src/modules/finance/transaction.schema.ts.
export type TransactionRecord = {
  id: string;
  kind: TransactionKind;
  category: TransactionCategory;
  // Expense category created by the office (AD-159).
  categoryName?: string;
  description: string;
  amountCents: number;
  dueDate: string;
  status: TransactionStatus;
  settledDate?: string;
  // Income only (AD-111): received installments, total received and receivable balance.
  installments: InstallmentRecord[];
  receivedCents?: number;
  balanceCents?: number;
  caseId?: string;
  caseNumber?: string;
  // Whoever hired the case's technical assistant (AD-135).
  client?: string;
};

export type InstallmentRecord = { id: string; amountCents: number; date: string; account?: string };

export type TransactionState = TransactionStatus | 'overdue';

export type TransactionsQueryParams = {
  page?: number;
  limit?: number;
  kind?: TransactionKind;
  state?: TransactionState;
  caseId?: string;
  category?: TransactionCategory;
  // Due date from `from` (inclusive) to `to` (exclusive).
  from?: string;
  to?: string;
  sort?: TransactionListSort;
  order?: SortOrder;
};

export type TransactionsListResult = { items: TransactionRecord[]; total: number };

export type FinanceSummary = {
  receivableCents: number;
  lateCents: number;
  receivedMonthCents: number;
  expensesMonthCents: number;
};

export type MonthlyFlow = { month: string; receivedCents: number; receivableCents: number; expensesCents: number };
// What moved in the period (by the cash flow's dates) and in the previous period of the same size (AD-253).
export type CategoryTotal = { category: TransactionCategory; totalCents: number; previousCents: number };

export const transactionKeys = {
  all: ['transaction'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (params: TransactionsQueryParams) => [...transactionKeys.lists(), params] as const,
  summary: () => [...transactionKeys.all, 'summary'] as const,
  flow: (months: number) => [...transactionKeys.all, 'flow', months] as const,
  categories: (kind: TransactionKind, months: number) => [...transactionKeys.all, 'categories', kind, months] as const,
  expenseNames: () => [...transactionKeys.all, 'expense-names'] as const,
};

const fetchData = async <T>(path: string): Promise<T> => {
  const res = await get<T>(path);
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t('load_error'));
  return res.data;
};

export const transactionsQuery = (params: TransactionsQueryParams = {}) =>
  queryOptions({
    queryKey: transactionKeys.list(params),
    queryFn: () => {
      const search = new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])),
      );
      const qs = search.toString();
      return fetchData<TransactionsListResult>(`/finance/entries${qs ? `?${qs}` : ''}`);
    },
  });

// Mirrors RevenueGoal of apps/api/src/modules/finance/transaction.schema.ts (MRA-02, AD-258, AD-259). Under the
// transaction keys, so a receipt refreshes it; saving a goal in Office invalidates it too.
export type RevenueGoal = {
  year: number;
  currentYear: number;
  years: number[];
  byMonth: { month: string; receivedCents: number }[];
  receivedCents: number;
  goalCents?: number;
  expectedCents?: number;
  perMonthCents?: number;
  monthsLeft: number;
};

// `year` missing = the current one.
export const revenueGoalQuery = (year?: number) =>
  queryOptions({
    queryKey: [...transactionKeys.all, 'revenue-goal', year ?? 'current'],
    queryFn: () => fetchData<RevenueGoal>(`/finance/revenue-goal${year ? `?year=${year}` : ''}`),
  });

export const financeSummaryQuery = queryOptions({
  queryKey: transactionKeys.summary(),
  queryFn: () => fetchData<FinanceSummary>('/finance/summary'),
});

export const monthlyFlowQuery = (months: number) =>
  queryOptions({
    queryKey: transactionKeys.flow(months),
    queryFn: () => fetchData<MonthlyFlow[]>(`/finance/flow?months=${months}`),
  });

export const categoriesQuery = (kind: TransactionKind, months: number) =>
  queryOptions({
    queryKey: transactionKeys.categories(kind, months),
    queryFn: () => fetchData<CategoryTotal[]>(`/finance/categories?kind=${kind}&months=${months}`),
  });

// Expense categories created by the office (AD-159).
export const expenseNamesQuery = queryOptions({
  queryKey: transactionKeys.expenseNames(),
  queryFn: () => fetchData<string[]>('/finance/expense-names'),
});

// Every write touches the totals: invalidates lists, summary, flow and categories at once.
export const createTransactionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TransactionRecord, Error, CreateTransaction> => ({
  mutationFn: async (data) => {
    const res = await post<TransactionRecord>('/finance/entries', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
});

export const updateTransactionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TransactionRecord, Error, { id: string; data: UpdateTransaction }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<TransactionRecord>(`/finance/entries/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
});

export const deleteTransactionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/finance/entries/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
});

// Partial fee receipt (AD-111): the API rejects an installment above the balance.
export const addInstallmentMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TransactionRecord, Error, { id: string; data: CreateInstallment }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await post<TransactionRecord>(`/finance/entries/${encodeURIComponent(id)}/installments`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
});

export const reverseInstallmentMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TransactionRecord, Error, { id: string; installmentId: string }> => ({
  mutationFn: async ({ id, installmentId }) => {
    const res = await del<TransactionRecord>(
      `/finance/entries/${encodeURIComponent(id)}/installments/${encodeURIComponent(installmentId)}`,
    );
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
});
