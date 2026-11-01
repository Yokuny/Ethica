import type { Permissions } from '@ethica/contracts';
import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { get, patch } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { userKeys } from '@/query/user.js';

// REG-07/08 (AD-071): diretório da tela de usuários, só admin. Consumidor
// único, por isso local; a chave fica sob userKeys.all para invalidar junto.
export type UserDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: Array<'admin' | 'manager' | 'operator'>;
  // Matriz efetiva (AD-137): admin com tudo.
  permissions: Permissions;
  active: boolean;
  createdAt: string;
  // Caminho versionado da foto (ACC-09), ausente sem foto.
  avatar?: string;
};

export const userDirectoryQuery = queryOptions({
  queryKey: [...userKeys.all, 'directory'] as const,
  queryFn: async (): Promise<UserDirectoryEntry[]> => {
    const res = await get<UserDirectoryEntry[]>('/auth/users/directory');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});

export const updatePermissionsMutation = (queryClient: QueryClient) => ({
  mutationFn: async ({ userId, permissions }: { userId: string; permissions: Permissions }) => {
    const res = await patch(`/auth/users/${userId}/permissions`, { permissions });
    if (!res.success) throw new Error(res.message ?? t('action_error'));
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: userDirectoryQuery.queryKey }),
});
