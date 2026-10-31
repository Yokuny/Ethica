import type { UpdateOffice } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, postFile, put } from '@/lib/api/client.api.js';
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
      ? await postFile<OfficeView>('/tenant/office/logo', png, 'image/png')
      : await del<OfficeView>('/tenant/office/logo');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: setOffice(queryClient),
});
