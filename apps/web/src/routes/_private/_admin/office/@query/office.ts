import type { UpdateOffice } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, put, sendFile } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Espelha OfficeView de apps/api/src/modules/identity/office.schema.ts.
export type OfficeView = {
  cabecalho: string;
  rodape: string;
  logo?: string;
  storageBytes: number;
  storageQuotaBytes: number;
  dataExports: { userName?: string; at: string }[];
};

export const officeKeys = { detail: ['office'] as const };

export const officeQuery = queryOptions({
  queryKey: officeKeys.detail,
  queryFn: async (): Promise<OfficeView> => {
    const res = await get<OfficeView>('/tenant/office');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

const setOffice = (queryClient: QueryClient) => (data: OfficeView) => queryClient.setQueryData(officeKeys.detail, data);

export const updateOfficeMutation = (
  queryClient: QueryClient,
): UseMutationOptions<OfficeView, Error, UpdateOffice> => ({
  mutationFn: async (data) => {
    const res = await put<OfficeView>('/tenant/office', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: setOffice(queryClient),
});

// `png` já reduzido no navegador (AD-120); `null` remove o logo.
export const setLogoMutation = (queryClient: QueryClient): UseMutationOptions<OfficeView, Error, Blob | null> => ({
  mutationFn: async (png) => {
    const res = png
      ? await sendFile<OfficeView>('/tenant/office/logo', png, 'image/png')
      : await del<OfficeView>('/tenant/office/logo');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: setOffice(queryClient),
});

// Modelo do aviso de agendamento às partes (AD-131); a API devolve o padrão quando não há.
export type AvisoAgendamento = { assunto: string; corpo: string };
export const avisoAgendamentoKeys = { detail: ['office', 'aviso-agendamento'] as const };

export const avisoAgendamentoQuery = queryOptions({
  queryKey: avisoAgendamentoKeys.detail,
  queryFn: async (): Promise<AvisoAgendamento> => {
    const res = await get<AvisoAgendamento>('/tenant/office/schedule-notice');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const updateAvisoAgendamentoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AvisoAgendamento, Error, AvisoAgendamento> => ({
  mutationFn: async (data) => {
    const res = await put<AvisoAgendamento>('/tenant/office/schedule-notice', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (data) => queryClient.setQueryData(avisoAgendamentoKeys.detail, data),
});
