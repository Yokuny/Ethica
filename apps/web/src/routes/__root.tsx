import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

// Context typed with the queryClient — it is what the beforeLoad of _private/route.tsx
// (T30) uses to call ensureQueryData(sessionQuery). TanStack Query owns
// the session truth; no Zustand here (AD-014, Tech Decisions).
export type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
