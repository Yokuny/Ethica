import { queryOptions } from '@tanstack/react-query';
import { get } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Espelha UserSummary de apps/api/src/modules/identity/auth.schema.ts
// — a verdade fica no back-end. `avatar` é o caminho versionado da foto,
// ausente sem foto; o UserChip acha a foto do responsável por aqui (ACC-07).
export type UserSummary = { id: string; name: string; avatar?: string };

export const userKeys = {
  all: ['user'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  activeLists: () => [...userKeys.all, 'list', 'active'] as const,
};

// Diretório do tenant da sessão (GET /auth/users, canOperate): popula o <Select>
// de "responsável" e dá a foto de cada pessoa ao UserChip. O nome do responsável
// de cada item continua vindo resolvido do server (assigneeName).
export const usersQuery = queryOptions({
  queryKey: userKeys.lists(),
  queryFn: async (): Promise<UserSummary[]> => {
    const res = await get<UserSummary[]>('/auth/users');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
  // Cada UserChip da tela monta esta query; o time muda pouco, e a troca da
  // própria conta invalida `userKeys.all` (query/account.ts).
  staleTime: 5 * 60_000,
});

// Só quem pode receber trabalho novo (GET /auth/users?active=true): seletor de
// responsável. Os filtros de lista continuam com `usersQuery`, que traz também
// os inativos — dados antigos ainda apontam para eles.
export const activeUsersQuery = queryOptions({
  queryKey: userKeys.activeLists(),
  queryFn: async (): Promise<UserSummary[]> => {
    const res = await get<UserSummary[]>('/auth/users?active=true');
    if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
    return res.data;
  },
});
