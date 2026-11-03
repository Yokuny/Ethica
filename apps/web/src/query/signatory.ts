import type { SignatoryInput } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, post, put, sendFile } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Technical responsible who signs reports (NLA-02). Mirrors SignatoryRecord of
// apps/api/src/modules/documents/signatory.schema.ts; `logo` is the versioned path of the image.
export type SignatoryRecord = SignatoryInput & { id: string; logo?: string };

export const signatoryKeys = { all: ['signatory'] as const };

const unwrap = <T>(res: { success: boolean; data?: T; message?: string }, fallback: string): T => {
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t(fallback));
  return res.data;
};

export const signatoriesQuery = queryOptions({
  queryKey: signatoryKeys.all,
  queryFn: async () => unwrap(await get<SignatoryRecord[]>('/expert-reports/signatories'), 'load_error'),
});

const refetch = (queryClient: QueryClient) => () => queryClient.invalidateQueries({ queryKey: signatoryKeys.all });

// Without `id` creates; with it, updates.
export const saveSignatoryMutation = (
  queryClient: QueryClient,
): UseMutationOptions<SignatoryRecord, Error, { id?: string; data: SignatoryInput }> => ({
  mutationFn: async ({ id, data }) =>
    unwrap(
      id
        ? await put<SignatoryRecord>(`/expert-reports/signatories/${id}`, data)
        : await post<SignatoryRecord>('/expert-reports/signatories', data),
      'save_error',
    ),
  onSuccess: refetch(queryClient),
});

export const deleteSignatoryMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-reports/signatories/${id}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: refetch(queryClient),
});

// `png` already shrunk in the browser (AD-120); `null` removes the logo.
export const setSignatoryLogoMutation = (
  queryClient: QueryClient,
): UseMutationOptions<void, Error, { id: string; png: Blob | null }> => ({
  mutationFn: async ({ id, png }) => {
    const res = png
      ? await sendFile<null>(`/expert-reports/signatories/${id}/logo`, png, 'image/png')
      : await del<null>(`/expert-reports/signatories/${id}/logo`);
    if (!res.success) throw new Error(res.message ?? t('action_error'));
  },
  onSuccess: refetch(queryClient),
});
