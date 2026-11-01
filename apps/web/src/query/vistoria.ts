import type { MidiaTipo, VistoriaDados } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { get, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { lerDia, lerRegistro, salvarDia } from '../lib/offline/store.js';
import { type CompromissoRecord, compromissoKeys } from './compromisso.js';

// Espelha os records de apps/api/src/modules/agenda/vistoria.schema.ts.
export type MidiaRecord = {
  id: string;
  tipo: MidiaTipo;
  bytes: number;
  mime: string;
  legenda?: string;
  createdAt: string;
};
export type VistoriaRecord = {
  compromissoId: string;
  caseId?: string;
  versao: number;
  dados: VistoriaDados;
  midias: MidiaRecord[];
  updatedAt?: string;
};
export type FieldCase = { id: string; processNumber: string; plaintiff?: string; defendant?: string };
export type VistoriaDoDia = { compromisso: CompromissoRecord; legalCase?: FieldCase; vistoria: VistoriaRecord };

export const vistoriaKeys = {
  all: ['vistoria'] as const,
  dia: (date: string) => [...vistoriaKeys.all, 'dia', date] as const,
  detail: (compromissoId: string) => [...vistoriaKeys.all, 'detail', compromissoId] as const,
  legalCase: (caseId: string) => [...vistoriaKeys.all, 'legalCase', caseId] as const,
  // Mídias ainda só no aparelho: dentro de `all`, a sincronização recarrega junto (AD-128).
  pending: (compromissoId: string) => [...vistoriaKeys.all, 'pending', compromissoId] as const,
};

// Rota do dia (CAM-01): com conexão, guarda a cópia no aparelho; sem ela, usa a cópia (AD-128).
export const vistoriaDiaQuery = (date: string) =>
  queryOptions({
    queryKey: vistoriaKeys.dia(date),
    queryFn: async (): Promise<{ itens: VistoriaDoDia[]; doAparelho: boolean }> => {
      const res = await get<VistoriaDoDia[]>(`/inspections/day?date=${date}`);
      if (res.success && res.data) {
        await salvarDia(date, res.data);
        return { itens: res.data, doAparelho: false };
      }
      const guardado = await lerDia(date);
      if (guardado) return { itens: guardado, doAparelho: true };
      throw new Error(res.message ?? t('load_error'));
    },
  });

export const vistoriaQuery = (compromissoId: string) =>
  queryOptions({
    queryKey: vistoriaKeys.detail(compromissoId),
    queryFn: async (): Promise<VistoriaDoDia> => {
      const res = await get<VistoriaDoDia>(`/inspections/${compromissoId}`);
      if (res.success && res.data) return res.data;
      const guardado = await lerRegistro(compromissoId);
      if (guardado) return guardado;
      throw new Error(res.message ?? t('load_error'));
    },
  });

export const caseInspectionsQuery = (caseId: string) =>
  queryOptions({
    queryKey: vistoriaKeys.legalCase(caseId),
    queryFn: async (): Promise<VistoriaDoDia[]> => {
      const res = await get<VistoriaDoDia[]>(`/inspections/expert-case/${caseId}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

// Mapa (AD-131): coordenadas do endereço, geocodificadas uma vez pela API.
export const geocodificarMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CompromissoRecord, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await post<CompromissoRecord>(`/agenda/${id}/geocode`);
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: vistoriaKeys.all }),
});

export const enviarAvisoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CompromissoRecord, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await post<CompromissoRecord>(`/agenda/${id}/notice`);
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: vistoriaKeys.all });
    queryClient.invalidateQueries({ queryKey: compromissoKeys.all });
  },
});
