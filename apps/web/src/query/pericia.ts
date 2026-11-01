import type {
  CreateMovimentacao,
  CreatePericia,
  Justica,
  MovimentacaoTipo,
  PapelPericia,
  ParteTipo,
  PericiaFase,
  PericiaSituacao,
  PericiaStatus,
  Polo,
  UpdatePericia,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha PericiaRecord de apps/api/src/modules/pericia/pericia.schema.ts — a
// verdade fica no back-end. Datas de calendário chegam `YYYY-MM-DD`; instantes, ISO.
export type PericiaRecord = {
  id: string;
  numeroProcesso: string;
  justica: Justica;
  papel: PapelPericia;
  tribunal: string;
  vara?: string;
  comarca?: string;
  objeto: string;
  // Cópia de tipo e nome do cadastro de partes (AD-117).
  partes: { parteId: string; polo: Polo; tipo: ParteTipo; nome: string; contratante?: boolean }[];
  status: PericiaStatus;
  // Fase detalhada e situação derivada no servidor (AD-133).
  fase?: PericiaFase;
  situacao: PericiaSituacao;
  dataNomeacao?: string;
  honorariosPropostosCents?: number;
  honorariosFixadosCents?: number;
  observacoes?: string;
  dataAutuacao?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  funcaoReclamante?: string;
  periodoImprescritoInicio?: string;
  periodoImprescritoFim?: string;
  localPericia?: string;
  // Movimentações que contam para a perícia parada (AD-121), da mais recente para a mais antiga.
  movimentacoes: { id: string; tipo: MovimentacaoTipo; data: string; observacoes?: string }[];
  oportunidadeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PericiasQueryParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: PericiaStatus;
  situacao?: PericiaSituacao;
  fase?: PericiaFase;
  justica?: Justica;
};

// Listagem: cada perícia com o prazo pendente mais próximo (AD-109), ausente se não há.
export type PericiaListItem = PericiaRecord & { proximoPrazo?: { titulo: string; vencimento: string } };

export type PericiasListResult = { items: PericiaListItem[]; total: number };

export type PericiaDistribution = {
  status: { key: string; count: number }[];
  justica: { key: string; count: number }[];
};

export const periciaKeys = {
  all: ['pericia'] as const,
  lists: () => [...periciaKeys.all, 'list'] as const,
  list: (params: PericiasQueryParams) => [...periciaKeys.lists(), params] as const,
  detail: (id: string) => [...periciaKeys.all, 'detail', id] as const,
  distribution: () => [...periciaKeys.all, 'distribution'] as const,
};

const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') search.set(key, String(value));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

// Listagem server-driven: página, busca e filtros vão na query, nunca slice em memória.
export const periciasQuery = (params: PericiasQueryParams = {}) =>
  queryOptions({
    queryKey: periciaKeys.list(params),
    queryFn: async (): Promise<PericiasListResult> => {
      const res = await get<PericiasListResult>(`/pericias${toQueryString(params)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const periciaQuery = (id: string) =>
  queryOptions({
    queryKey: periciaKeys.detail(id),
    queryFn: async (): Promise<PericiaRecord> => {
      const res = await get<PericiaRecord>(`/pericias/${encodeURIComponent(id)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const periciaDistributionQuery = queryOptions({
  queryKey: periciaKeys.distribution(),
  queryFn: async (): Promise<PericiaDistribution> => {
    const res = await get<PericiaDistribution>('/pericias/distribution');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const createPericiaMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PericiaRecord, Error, CreatePericia> => ({
  mutationFn: async (data) => {
    const res = await post<PericiaRecord>('/pericias', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: periciaKeys.all });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/pericias/stats'] });
  },
});

export const updatePericiaMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PericiaRecord, Error, { id: string; data: UpdatePericia }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<PericiaRecord>(`/pericias/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (updated) => {
    queryClient.setQueryData(periciaKeys.detail(updated.id), updated);
    queryClient.invalidateQueries({ queryKey: periciaKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/pericias/stats'] });
    queryClient.invalidateQueries({ queryKey: periciaKeys.distribution() });
  },
});

export const deletePericiaMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/pericias/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: periciaKeys.all }),
});

export const addMovimentacaoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PericiaRecord, Error, { periciaId: string; data: CreateMovimentacao }> => ({
  mutationFn: async ({ periciaId, data }) => {
    const res = await post<PericiaRecord>(`/pericias/${encodeURIComponent(periciaId)}/movimentacoes`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: (updated) => queryClient.setQueryData(periciaKeys.detail(updated.id), updated),
});

export const removeMovimentacaoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<PericiaRecord, Error, { periciaId: string; movimentacaoId: string }> => ({
  mutationFn: async ({ periciaId, movimentacaoId }) => {
    const res = await del<PericiaRecord>(
      `/pericias/${encodeURIComponent(periciaId)}/movimentacoes/${encodeURIComponent(movimentacaoId)}`,
    );
    if (!res.success || !res.data) throw new Error(res.message ?? t('remove_error'));
    return res.data;
  },
  onSuccess: (updated) => queryClient.setQueryData(periciaKeys.detail(updated.id), updated),
});

// Bloco "Perícias paradas" do início (GES-05): mesma regra do PDF (AD-121), sem as suspensas.
export type PericiaParada = {
  id: string;
  numeroProcesso: string;
  status: PericiaStatus;
  objeto: string;
  referencia: string;
  diasParada: number;
};
export type PericiasParadas = { total: number; items: PericiaParada[] };

export const periciasParadasQuery = queryOptions({
  queryKey: [...periciaKeys.all, 'paradas'] as const,
  queryFn: async (): Promise<PericiasParadas> => {
    const res = await get<PericiasParadas>('/pericias/paradas');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});
