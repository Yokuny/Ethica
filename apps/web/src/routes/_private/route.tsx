import { SidebarInset, SidebarProvider } from '@ethica/ui/components/sidebar';
import type { QueryClient } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { MobileDock } from '../../components/mobile-dock.js';
import { t } from '../../lib/helpers/translate.helper.js';
import { can, type SessionView, sessionQuery } from '../../query/session.js';
import { WorkspaceNavigation } from './@components/workspace-navigation.js';
import { moduleFromRoute } from './@utils/home-access.js';

// Tech Decisions (design.md): beforeLoad + ensureQueryData(GET /auth/session),
// NEVER Zustand — avoids the second source of truth that would cause the
// redirect loop FND-10/AC3 forbids. sessionQuery has retry:false, so
// an invalid session fails on the first attempt and redirects only once
// per navigation — never retries and never piles up redirects.
export const beforeLoad = async ({
  context,
  location,
}: {
  context: { queryClient: QueryClient };
  location?: { pathname: string };
}): Promise<void> => {
  let session: SessionView;
  try {
    session = await context.queryClient.ensureQueryData(sessionQuery);
  } catch (error) {
    // Suspended tenant (403 tenant_suspended): the session is valid, so going back
    // to /auth would only repeat the sign-in; its own screen explains and offers to sign out.
    if (error instanceof Error && error.message === t('tenant_suspended')) throw redirect({ to: '/suspended' });
    throw redirect({ to: '/auth' });
  }
  // Single module guard through the matrix (AD-137): without `view`, back home.
  const module = location ? moduleFromRoute(location.pathname) : undefined;
  if (module && !can(session, module)) throw redirect({ to: '/' });
};

// The session is guaranteed by beforeLoad. The shell shares the side navigation
// on desktop and keeps the dock for smaller screens.
export const Route = createFileRoute('/_private')({
  beforeLoad,
  component: () => (
    <SidebarProvider data-app-experience>
      <WorkspaceNavigation />
      <SidebarInset className="min-w-0 pb-16 md:pb-0">
        <Outlet />
      </SidebarInset>
      <MobileDock />
    </SidebarProvider>
  ),
});
