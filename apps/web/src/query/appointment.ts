import type {
  AppointmentReason,
  AppointmentStatus,
  AppointmentType,
  CreateAppointment,
  UpdateAppointment,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha CompromissoRecord de apps/api/src/modules/agenda/compromisso.schema.ts.
export type AppointmentRecord = {
  id: string;
  type: AppointmentType;
  title: string;
  start: string;
  end: string;
  location?: string;
  caseId?: string;
  caseNumber?: string;
  status: AppointmentStatus;
  origin: 'manual' | 'automatic';
  notes?: string;
  // Campo (AD-130, AD-131): motivo do cancelamento, coordenadas do endereço e avisos enviados.
  reason?: AppointmentReason;
  coordinates?: { lat: number; lng: number };
  notices?: { userId: string; at: string; recipients: string[] }[];
};

// `from`/`to`: datas de calendário do fuso de exibição, intervalo [from, to).
export type AppointmentsQueryParams = { from: string; to: string; type?: AppointmentType; caseId?: string };

export const appointmentKeys = {
  all: ['appointment'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (params: AppointmentsQueryParams) => [...appointmentKeys.lists(), params] as const,
  upcoming: (params: { limit: number; caseId?: string }) => [...appointmentKeys.all, 'upcoming', params] as const,
};

export const appointmentsQuery = (params: AppointmentsQueryParams) =>
  queryOptions({
    queryKey: appointmentKeys.list(params),
    queryFn: async (): Promise<AppointmentRecord[]> => {
      const search = new URLSearchParams({ from: params.from, to: params.to });
      if (params.type) search.set('type', params.type);
      if (params.caseId) search.set('caseId', params.caseId);
      const res = await get<AppointmentRecord[]>(`/agenda?${search.toString()}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const upcomingAppointmentsQuery = (params: { limit: number; caseId?: string }) =>
  queryOptions({
    queryKey: appointmentKeys.upcoming(params),
    queryFn: async (): Promise<AppointmentRecord[]> => {
      const search = new URLSearchParams({ limit: String(params.limit) });
      if (params.caseId) search.set('caseId', params.caseId);
      const res = await get<AppointmentRecord[]>(`/agenda/upcoming?${search.toString()}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const createAppointmentMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AppointmentRecord, Error, CreateAppointment> => ({
  mutationFn: async (data) => {
    const res = await post<AppointmentRecord>('/agenda', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
});

export const updateAppointmentMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AppointmentRecord, Error, { id: string; data: UpdateAppointment }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<AppointmentRecord>(`/agenda/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
});

export const deleteAppointmentMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/agenda/${encodeURIComponent(id)}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
});
