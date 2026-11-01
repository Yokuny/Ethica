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

// Mirrors SessionView of apps/api/src/modules/identity/auth.service.ts — the
// truth lives in the back-end; this type only describes what the screen consumes.
export type SessionView = {
  tenant?: { id: string; name: string; status: string };
  user: { id: string; name: string; email: string; avatar?: string };
  role: Role[];
  // Effective matrix (AD-137); a session stored on the device before it may come without one.
  permissions?: Permissions;
};

// Same `isAdmin` rule as the back-end (authorization.middleware.ts): the
// `admin` role in the user's role list in the tenant.
export const isAdminSession = (session: SessionView): boolean => session.role.includes('admin');
// Same matrix the API checks with `hasPermission()` (AD-137): the web only hides what it would reject.
export const can = (session: SessionView, module: PermissionModule, action: PermissionAction = 'view'): boolean =>
  hasPermission(session.permissions ?? {}, module, action);

export const sessionKeys = {
  all: ['session'] as const,
  detail: () => [...sessionKeys.all, 'detail'] as const,
};

// staleTime > 0: the route guard (_private/route.tsx, T30) calls
// ensureQueryData(sessionQuery) on every beforeLoad — without staleTime the session
// would be refetched on every private navigation. retry:false: an invalid session
// must fail on the first attempt, never retry and delay the redirect
// (Tech Decisions: route guard without a loop).
export const sessionQuery = queryOptions({
  queryKey: sessionKeys.detail(),
  queryFn: async (): Promise<SessionView> => {
    const res = await get<SessionView>('/auth/session');
    if (res.success && res.data) {
      void saveSession(res.data);
      return res.data;
    }
    // No network (AD-128): the last session seen keeps the app open; an invalid session does not pass.
    if (res.message === t('connection_error')) {
      const copy = await readSession<SessionView>();
      if (copy) return copy;
    }
    throw new Error(res.message ?? t('invalid_session'));
  },
  staleTime: 60_000,
  retry: false,
});
