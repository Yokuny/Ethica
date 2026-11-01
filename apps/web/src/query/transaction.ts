import type {
  CreateInstallment,
  CreateTransaction,
  TransactionCategory,
  TransactionKind,
  TransactionStatus,
  UpdateTransaction,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha os tipos de apps/api/src/modules/financeiro/lancamento.schema.ts.
export type TransactionRecord = {
  id: string;
  kind: TransactionKind;
  category: TransactionCategory;
  description: string;
  amountCents: number;
  dueDate: string;
  status: TransactionStatus;
  settledDate?: string;
  // Só receita (AD-111): parcelas recebidas, total recebido e saldo a receber.
  installments: InstallmentRecord[];
  receivedCents?: number;
  balanceCents?: number;
  caseId?: string;
  caseNumber?: string;
  // Quem contratou o assistente técnico da perícia (AD-135).
  client?: string;
};

export type InstallmentRecord = { id: string; amountCents: number; data: string; account?: string };

export type TransactionState = TransactionStatus | 'overdue';

export type TransactionsQueryParams = {
  page?: number;
  limit?: number;
  kind?: TransactionKind;
  state?: TransactionState;
  caseId?: string;
};

export type TransactionsListResult = { items: TransactionRecord[]; total: number };

export type FinanceSummary = {
  receivableCents: number;
  lateCents: number;
  receivedMonthCents: number;
  expensesMonthCents: number;
};

export type MonthlyFlow = { month: string; receivedCents: number; receivableCents: number; expensesCents: number };
export type CategoryTotal = { category: TransactionCategory; totalCents: number };

export const transactionKeys = {
  all: ['transaction'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (params: TransactionsQueryParams) => [...transactionKeys.lists(), params] as const,
  summary: () => [...transactionKeys.all, 'summary'] as const,
  flow: (months: number) => [...transactionKeys.all, 'flow', months] as const,
  categories: (kind: TransactionKind) => [...transactionKeys.all, 'categories', kind] as const,
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

export const financeSummaryQuery = queryOptions({
  queryKey: transactionKeys.summary(),
  queryFn: () => fetchData<FinanceSummary>('/finance/summary'),
});

export const monthlyFlowQuery = (months: number) =>
  queryOptions({
    queryKey: transactionKeys.flow(months),
    queryFn: () => fetchData<MonthlyFlow[]>(`/finance/flow?months=${months}`),
  });

export const categoriesQuery = (kind: TransactionKind) =>
  queryOptions({
    queryKey: transactionKeys.categories(kind),
    queryFn: () => fetchData<CategoryTotal[]>(`/finance/categories?kind=${kind}`),
  });

// Toda escrita mexe nos totais: invalida listas, resumo, fluxo e categorias de uma vez.
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

// Recebimento parcial do honorário (AD-111): a API recusa parcela acima do saldo.
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
