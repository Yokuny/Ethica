import type { ChangePassword, UpdateProfile } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { del, patch, put } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { sessionKeys } from '@/query/session.js';
import { userKeys } from '@/query/user.js';

// Espelha AccountView de apps/api/src/modules/identity/account.schema.ts.
export type AccountView = { name: string; avatar?: string };

// Nome e foto aparecem no menu (sessão), nos responsáveis (usersQuery) e no
// diretório (sob userKeys.all): tudo é recarregado depois de mudar.
const refreshAccount = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  queryClient.invalidateQueries({ queryKey: userKeys.all });
};

export const updateProfileMutation = (
  queryClient: QueryClient,
): UseMutationOptions<AccountView, Error, UpdateProfile> => ({
  mutationFn: async (data) => {
    const res = await patch<AccountView>('/me/profile', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => refreshAccount(queryClient),
});

export const changePasswordMutation = (): UseMutationOptions<void, Error, ChangePassword> => ({
  mutationFn: async (data) => {
    const res = await put('/me/password', data);
    if (!res.success) throw new Error(res.message ?? t('action_error'));
  },
});

// `image` é a data URL já reduzida no navegador; `null` remove a foto.
export const setAvatarMutation = (queryClient: QueryClient): UseMutationOptions<AccountView, Error, string | null> => ({
  mutationFn: async (image) => {
    const res = image ? await put<AccountView>('/me/avatar', { image }) : await del<AccountView>('/me/avatar');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => refreshAccount(queryClient),
});
