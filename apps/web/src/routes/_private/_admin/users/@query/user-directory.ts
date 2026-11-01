import type { Permissions } from '@ethica/contracts';
import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { get, patch } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { userKeys } from '@/query/user.js';

// REG-07/08 (AD-071): users screen directory, admin only. Single
// consumer, hence local; the key lives under userKeys.all to be invalidated together.
export type UserDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: Array<'admin' | 'manager' | 'operator'>;
  // Effective matrix (AD-137): admin with everything.
  permissions: Permissions;
  active: boolean;
  createdAt: string;
  // Versioned photo path (ACC-09), missing without a photo.
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
