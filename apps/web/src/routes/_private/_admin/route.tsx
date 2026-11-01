import type { QueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { isAdminSession, sessionQuery } from '../../../query/session.js';

// Pathless layout (not in the URL) of the admin-only screens — today only the custom
// fields. Same binary guard as _private/route.tsx, one level down: the
// session is already in the cache (parent's ensureQueryData), and whoever is not admin goes back
// home instead of seeing a screen whose actions the back-end would reject (403).
export const beforeLoad = async ({ context }: { context: { queryClient: QueryClient } }): Promise<void> => {
  const session = await context.queryClient.ensureQueryData(sessionQuery);
  if (!isAdminSession(session)) throw redirect({ to: '/' });
};

export const Route = createFileRoute('/_private/_admin')({ beforeLoad });
