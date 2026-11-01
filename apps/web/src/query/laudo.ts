import type {
  ConcluirLaudo,
  CreateLaudo,
  CreateModeloLaudo,
  LaudoStatus,
  LaudoTipo,
  LaudoVariante,
  LaudoVariavel,
  ModeloSecao,
  UpdateLaudoSecao,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post, put } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { caseKeys } from './case.js';
import { deadlineKeys } from './deadline.js';

// Espelha os records de apps/api/src/modules/documentos/laudo.schema.ts.
export type ModeloSecaoRecord = ModeloSecao & { id: string };
export type ModeloLaudoRecord = {
  id: string;
  nome: string;
  tipo: LaudoTipo;
  padrao: boolean;
  secoes: ModeloSecaoRecord[];
  updatedAt?: string;
};
export type TemplateSummary = Omit<ModeloLaudoRecord, 'secoes'> & { totalSecoes: number };

export type LaudoSecaoRecord = {
  id: string;
  titulo: string;
  nivel: number;
  apenasTitulo: boolean;
  quebraPagina: boolean;
  variante: LaudoVariante;
  html: string;
};
export type LaudoRecord = {
  id: string;
  caseId: string;
  caseNumber?: string;
  tipo: LaudoTipo;
  status: LaudoStatus;
  titulo: string;
  modeloNome: string;
  secoes: LaudoSecaoRecord[];
  pendencias: { secaoId: string; variaveis: LaudoVariavel[] }[];
  concluidoEm?: string;
  createdAt: string;
  updatedAt: string;
};
export type LaudoListItem = Omit<LaudoRecord, 'secoes' | 'pendencias'> & { totalSecoes: number };
export type LaudosQueryParams = { page?: number; limit?: number; status?: LaudoStatus; caseId?: string };

export const laudoKeys = {
  all: ['laudo'] as const,
  lists: () => [...laudoKeys.all, 'list'] as const,
  list: (params: LaudosQueryParams) => [...laudoKeys.lists(), params] as const,
  detail: (id: string) => [...laudoKeys.all, 'detail', id] as const,
  modelos: (tipo?: LaudoTipo) => [...laudoKeys.all, 'modelos', tipo ?? 'all'] as const,
  modelo: (id: string) => [...laudoKeys.all, 'modelo', id] as const,
};

const unwrap = <T>(res: { success: boolean; data?: T; message?: string }, fallback: string): T => {
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t(fallback));
  return res.data;
};

const qs = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const laudosQuery = (params: LaudosQueryParams = {}) =>
  queryOptions({
    queryKey: laudoKeys.list(params),
    queryFn: async () =>
      unwrap(await get<{ items: LaudoListItem[]; total: number }>(`/expert-reports${qs(params)}`), 'load_error'),
  });

export const laudoQuery = (id: string) =>
  queryOptions({
    queryKey: laudoKeys.detail(id),
    queryFn: async () => unwrap(await get<LaudoRecord>(`/expert-reports/${encodeURIComponent(id)}`), 'load_error'),
  });

export const modelosQuery = (tipo?: LaudoTipo) =>
  queryOptions({
    queryKey: laudoKeys.modelos(tipo),
    queryFn: async () => unwrap(await get<TemplateSummary[]>(`/expert-reports/templates${qs({ tipo })}`), 'load_error'),
  });

export const modeloQuery = (id: string) =>
  queryOptions({
    queryKey: laudoKeys.modelo(id),
    queryFn: async () =>
      unwrap(await get<ModeloLaudoRecord>(`/expert-reports/templates/${encodeURIComponent(id)}`), 'load_error'),
  });

// Laudo: a resposta já é o laudo atualizado; grava no cache do detalhe e refaz as listas.
const updatedReport = (queryClient: QueryClient, laudo: LaudoRecord) => {
  queryClient.setQueryData(laudoKeys.detail(laudo.id), laudo);
  queryClient.invalidateQueries({ queryKey: laudoKeys.lists() });
};

export const createLaudoMutation = (queryClient: QueryClient): UseMutationOptions<LaudoRecord, Error, CreateLaudo> => ({
  mutationFn: async (data) => unwrap(await post<LaudoRecord>('/expert-reports', data), 'create_error'),
  onSuccess: (laudo) => updatedReport(queryClient, laudo),
});

export const updateLaudoSecaoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<LaudoRecord, Error, { id: string; secaoId: string; data: UpdateLaudoSecao }> => ({
  mutationFn: async ({ id, secaoId, data }) =>
    unwrap(await patch<LaudoRecord>(`/expert-reports/${id}/sections/${secaoId}`, data), 'save_error'),
  onSuccess: (laudo) => updatedReport(queryClient, laudo),
});

export const removeLaudoSecaoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<LaudoRecord, Error, { id: string; secaoId: string }> => ({
  mutationFn: async ({ id, secaoId }) =>
    unwrap(await del<LaudoRecord>(`/expert-reports/${id}/sections/${secaoId}`), 'remove_error'),
  onSuccess: (laudo) => updatedReport(queryClient, laudo),
});

// Concluir com a entrega mexe no prazo, nas movimentações e na etapa da perícia (AD-126).
export const concluirLaudoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<LaudoRecord, Error, { id: string; data: ConcluirLaudo }> => ({
  mutationFn: async ({ id, data }) =>
    unwrap(await post<LaudoRecord>(`/expert-reports/${id}/complete`, data), 'action_error'),
  onSuccess: (laudo) => {
    updatedReport(queryClient, laudo);
    queryClient.invalidateQueries({ queryKey: caseKeys.all });
    queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
  },
});

export const deleteLaudoMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-reports/${id}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: laudoKeys.lists() }),
});

// Modelos: grava o detalhe e refaz as listas de modelos.
const updatedTemplate = (queryClient: QueryClient, modelo: ModeloLaudoRecord) => {
  queryClient.setQueryData(laudoKeys.modelo(modelo.id), modelo);
  queryClient.invalidateQueries({ queryKey: [...laudoKeys.all, 'modelos'] });
};

export const createModeloMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ModeloLaudoRecord, Error, CreateModeloLaudo> => ({
  mutationFn: async (data) => unwrap(await post<ModeloLaudoRecord>('/expert-reports/templates', data), 'create_error'),
  onSuccess: (modelo) => updatedTemplate(queryClient, modelo),
});

export const renameModeloMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ModeloLaudoRecord, Error, { id: string; nome: string }> => ({
  mutationFn: async ({ id, nome }) =>
    unwrap(await patch<ModeloLaudoRecord>(`/expert-reports/templates/${id}`, { nome }), 'save_error'),
  onSuccess: (modelo) => updatedTemplate(queryClient, modelo),
});

export const deleteModeloMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-reports/templates/${id}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: [...laudoKeys.all, 'modelos'] }),
});

export const saveModeloSecaoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ModeloLaudoRecord, Error, { id: string; secaoId?: string; data: ModeloSecao }> => ({
  mutationFn: async ({ id, secaoId, data }) =>
    unwrap(
      secaoId
        ? await put<ModeloLaudoRecord>(`/expert-reports/templates/${id}/sections/${secaoId}`, data)
        : await post<ModeloLaudoRecord>(`/expert-reports/templates/${id}/sections`, data),
      'save_error',
    ),
  onSuccess: (modelo) => updatedTemplate(queryClient, modelo),
});

export const removeModeloSecaoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ModeloLaudoRecord, Error, { id: string; secaoId: string }> => ({
  mutationFn: async ({ id, secaoId }) =>
    unwrap(await del<ModeloLaudoRecord>(`/expert-reports/templates/${id}/sections/${secaoId}`), 'remove_error'),
  onSuccess: (modelo) => updatedTemplate(queryClient, modelo),
});

export const moverModeloSecaoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ModeloLaudoRecord, Error, { id: string; secaoId: string; direcao: 'up' | 'down' }> => ({
  mutationFn: async ({ id, secaoId, direcao }) =>
    unwrap(
      await post<ModeloLaudoRecord>(`/expert-reports/templates/${id}/sections/${secaoId}/move`, { direcao }),
      'save_error',
    ),
  onSuccess: (modelo) => updatedTemplate(queryClient, modelo),
});
