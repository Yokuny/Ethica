import type { InspectionData, MediaType } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { get, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { readDay, readRecord, saveDay } from '../lib/offline/store.js';
import { type AppointmentRecord, appointmentKeys } from './appointment.js';

// Espelha os records de apps/api/src/modules/agenda/vistoria.schema.ts.
export type MediaRecord = {
  id: string;
  tipo: MediaType;
  bytes: number;
  mime: string;
  caption?: string;
  createdAt: string;
};
export type InspectionRecord = {
  appointmentId: string;
  caseId?: string;
  versao: number;
  dados: InspectionData;
  media: MediaRecord[];
  updatedAt?: string;
};
export type FieldCase = { id: string; processNumber: string; plaintiff?: string; defendant?: string };
export type DayInspection = { appointment: AppointmentRecord; legalCase?: FieldCase; inspection: InspectionRecord };

export const inspectionKeys = {
  all: ['inspection'] as const,
  day: (date: string) => [...inspectionKeys.all, 'day', date] as const,
  detail: (appointmentId: string) => [...inspectionKeys.all, 'detail', appointmentId] as const,
  legalCase: (caseId: string) => [...inspectionKeys.all, 'legalCase', caseId] as const,
  // Mídias ainda só no aparelho: dentro de `all`, a sincronização recarrega junto (AD-128).
  pending: (appointmentId: string) => [...inspectionKeys.all, 'pending', appointmentId] as const,
};

// Rota do dia (CAM-01): com conexão, guarda a cópia no aparelho; sem ela, usa a cópia (AD-128).
export const inspectionDayQuery = (date: string) =>
  queryOptions({
    queryKey: inspectionKeys.day(date),
    queryFn: async (): Promise<{ itens: DayInspection[]; ofDevice: boolean }> => {
      const res = await get<DayInspection[]>(`/inspections/day?date=${date}`);
      if (res.success && res.data) {
        await saveDay(date, res.data);
        return { itens: res.data, ofDevice: false };
      }
      const guardado = await readDay(date);
      if (guardado) return { itens: guardado, ofDevice: true };
      throw new Error(res.message ?? t('load_error'));
    },
  });

export const inspectionQuery = (appointmentId: string) =>
  queryOptions({
    queryKey: inspectionKeys.detail(appointmentId),
    queryFn: async (): Promise<DayInspection> => {
      const res = await get<DayInspection>(`/inspections/${appointmentId}`);
      if (res.success && res.data) return res.data;
      const guardado = await readRecord(appointmentId);
      if (guardado) return guardado;
      throw new Error(res.message ?? t('load_error'));
    },
  });

export const caseInspectionsQuery = (caseId: string) =>
  queryOptions({
    queryKey: inspectionKeys.legalCase(caseId),
    queryFn: async (): Promise<DayInspection[]> => {
      const res = await get<DayInspection[]>(`/inspections/expert-case/${caseId}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

// Mapa (AD-131): coordenadas do endereço, geocodificadas uma vez pela API.
export const geocodeMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AppointmentRecord, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await post<AppointmentRecord>(`/agenda/${id}/geocode`);
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: inspectionKeys.all }),
});

export const sendNoticeMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AppointmentRecord, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await post<AppointmentRecord>(`/agenda/${id}/notice`);
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  },
});
