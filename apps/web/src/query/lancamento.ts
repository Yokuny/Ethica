import type {
  CreateLancamento,
  CreateParcela,
  LancamentoCategoria,
  LancamentoNatureza,
  LancamentoStatus,
  UpdateLancamento,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha os tipos de apps/api/src/modules/financeiro/lancamento.schema.ts.
export type LancamentoRecord = {
  id: string;
  natureza: LancamentoNatureza;
  categoria: LancamentoCategoria;
  descricao: string;
  valorCents: number;
  vencimento: string;
  status: LancamentoStatus;
  liquidadoEm?: string;
  // Só receita (AD-111): parcelas recebidas, total recebido e saldo a receber.
  parcelas: ParcelaRecord[];
  recebidoCents?: number;
  saldoCents?: number;
  caseId?: string;
  caseNumber?: string;
  // Quem contratou o assistente técnico da perícia (AD-135).
  client?: string;
};

export type ParcelaRecord = { id: string; valorCents: number; data: string; conta?: string };

export type TransactionState = LancamentoStatus | 'overdue';

export type LancamentosQueryParams = {
  page?: number;
  limit?: number;
  natureza?: LancamentoNatureza;
  state?: TransactionState;
  caseId?: string;
};

export type LancamentosListResult = { items: LancamentoRecord[]; total: number };

export type FinanceiroResumo = {
  aReceberCents: number;
  lateCents: number;
  receivedMonthCents: number;
  expensesMonthCents: number;
};

export type FluxoMensal = { month: string; recebidoCents: number; aReceberCents: number; despesasCents: number };
export type CategoriaTotal = { categoria: LancamentoCategoria; totalCents: number };

export const lancamentoKeys = {
  all: ['lancamento'] as const,
  lists: () => [...lancamentoKeys.all, 'list'] as const,
  list: (params: LancamentosQueryParams) => [...lancamentoKeys.lists(), params] as const,
  resumo: () => [...lancamentoKeys.all, 'resumo'] as const,
  fluxo: (months: number) => [...lancamentoKeys.all, 'fluxo', months] as const,
  categorias: (natureza: LancamentoNatureza) => [...lancamentoKeys.all, 'categorias', natureza] as const,
};

const fetchData = async <T>(path: string): Promise<T> => {
  const res = await get<T>(path);
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t('load_error'));
  return res.data;
};

export const lancamentosQuery = (params: LancamentosQueryParams = {}) =>
  queryOptions({
    queryKey: lancamentoKeys.list(params),
    queryFn: () => {
      const search = new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])),
      );
      const qs = search.toString();
      return fetchData<LancamentosListResult>(`/finance/entries${qs ? `?${qs}` : ''}`);
    },
  });

export const financeiroResumoQuery = queryOptions({
  queryKey: lancamentoKeys.resumo(),
  queryFn: () => fetchData<FinanceiroResumo>('/finance/summary'),
});

export const fluxoMensalQuery = (months: number) =>
  queryOptions({
    queryKey: lancamentoKeys.fluxo(months),
    queryFn: () => fetchData<FluxoMensal[]>(`/finance/flow?months=${months}`),
  });

export const categoriasQuery = (natureza: LancamentoNatureza) =>
  queryOptions({
    queryKey: lancamentoKeys.categorias(natureza),
    queryFn: () => fetchData<CategoriaTotal[]>(`/finance/categories?natureza=${natureza}`),
  });

// Toda escrita mexe nos totais: invalida listas, resumo, fluxo e categorias de uma vez.
export const createLancamentoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<LancamentoRecord, Error, CreateLancamento> => ({
  mutationFn: async (data) => {
    const res = await post<LancamentoRecord>('/finance/entries', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: lancamentoKeys.all }),
});

export const updateLancamentoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<LancamentoRecord, Error, { id: string; data: UpdateLancamento }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<LancamentoRecord>(`/finance/entries/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: lancamentoKeys.all }),
});

export const deleteLancamentoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/finance/entries/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: lancamentoKeys.all }),
});

// Recebimento parcial do honorário (AD-111): a API recusa parcela acima do saldo.
export const addParcelaMutation = (
  queryClient: QueryClient,
): UseMutationOptions<LancamentoRecord, Error, { id: string; data: CreateParcela }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await post<LancamentoRecord>(`/finance/entries/${encodeURIComponent(id)}/installments`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: lancamentoKeys.all }),
});

export const estornarParcelaMutation = (
  queryClient: QueryClient,
): UseMutationOptions<LancamentoRecord, Error, { id: string; parcelaId: string }> => ({
  mutationFn: async ({ id, parcelaId }) => {
    const res = await del<LancamentoRecord>(
      `/finance/entries/${encodeURIComponent(id)}/installments/${encodeURIComponent(parcelaId)}`,
    );
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: lancamentoKeys.all }),
});
