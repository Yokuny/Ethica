import {
  hasPermission,
  type PermissionAction,
  type PermissionModule,
  type Permissions,
  type Role,
} from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { readSession, saveSession } from '../lib/offline/store.js';

// Espelha SessionView de apps/api/src/modules/identity/auth.service.ts — a
// verdade fica no back-end; este tipo só descreve o que a tela consome.
export type SessionView = {
  tenant?: { id: string; name: string; status: string };
  user: { id: string; name: string; email: string; avatar?: string };
  role: Role[];
  // Matriz efetiva (AD-137); a sessão guardada no aparelho antes dela pode vir sem.
  permissions?: Permissions;
};

// Mesma regra de `isAdmin` do back-end (authorization.middleware.ts): o
// papel `admin` na lista de papéis do usuário no tenant.
export const isAdminSession = (session: SessionView): boolean => session.role.includes('admin');
// Mesma matriz que a API checa com `can()` (AD-137): o web só esconde o que ela recusaria.
export const can = (session: SessionView, module: PermissionModule, action: PermissionAction = 'view'): boolean =>
  hasPermission(session.permissions ?? {}, module, action);

export const sessionKeys = {
  all: ['session'] as const,
  detail: () => [...sessionKeys.all, 'detail'] as const,
};

// staleTime > 0: o guard de rota (_private/route.tsx, T30) chama
// ensureQueryData(sessionQuery) em todo beforeLoad — sem staleTime a sessão
// seria refeita a cada navegação privada. retry:false: uma sessão inválida
// deve falhar na primeira tentativa, nunca re-tentar e atrasar o redirect
// (Tech Decisions: guarda de rota sem loop).
export const sessionQuery = queryOptions({
  queryKey: sessionKeys.detail(),
  queryFn: async (): Promise<SessionView> => {
    const res = await get<SessionView>('/auth/session');
    if (res.success && res.data) {
      void saveSession(res.data);
      return res.data;
    }
    // Sem rede (AD-128): a última sessão vista mantém o app aberto; sessão inválida não passa.
    if (res.message === t('connection_error')) {
      const copy = await readSession<SessionView>();
      if (copy) return copy;
    }
    throw new Error(res.message ?? t('invalid_session'));
  },
  staleTime: 60_000,
  retry: false,
});
