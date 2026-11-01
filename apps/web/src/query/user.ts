import { queryOptions } from '@tanstack/react-query';
import { get } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Mirrors UserSummary of apps/api/src/modules/identity/auth.schema.ts
// — the truth lives in the back-end. `avatar` is the versioned photo path,
// missing without a photo; the UserChip finds the assignee photo through here (ACC-07).
export type UserSummary = { id: string; name: string; avatar?: string };

export const userKeys = {
  all: ['user'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  activeLists: () => [...userKeys.all, 'list', 'active'] as const,
};

// Session tenant directory (GET /auth/users, canOperate): populates the "assignee"
// <Select> and gives each person's photo to the UserChip. The assignee name
// of each item still comes resolved from the server (assigneeName).
export const usersQuery = queryOptions({
  queryKey: userKeys.lists(),
  queryFn: async (): Promise<UserSummary[]> => {
    const res = await get<UserSummary[]>('/auth/users');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
  // Every UserChip on screen mounts this query; the team changes little, and changing
  // your own account invalidates `userKeys.all` (query/account.ts).
  staleTime: 5 * 60_000,
});

// Only who can get new work (GET /auth/users?active=true): assignee
// selector. The list filters stay on `usersQuery`, which also brings
// the inactive ones — old data still points to them.
export const activeUsersQuery = queryOptions({
  queryKey: userKeys.activeLists(),
  queryFn: async (): Promise<UserSummary[]> => {
    const res = await get<UserSummary[]>('/auth/users?active=true');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});
