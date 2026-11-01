import { SidebarInset, SidebarProvider } from '@ethica/ui/components/sidebar';
import type { QueryClient } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { MobileDock } from '../../components/mobile-dock.js';
import { t } from '../../lib/helpers/translate.helper.js';
import { can, type SessionView, sessionQuery } from '../../query/session.js';
import { WorkspaceNavigation } from './@components/workspace-navigation.js';
import { moduloDaRota } from './@utils/home-access.js';

// Tech Decisions (design.md): beforeLoad + ensureQueryData(GET /auth/session),
// NUNCA Zustand — evita a segunda fonte de verdade que causaria o loop de
// redirecionamento que FND-10/AC3 proíbe. sessionQuery tem retry:false, então
// uma sessão inválida falha na primeira tentativa e redireciona uma única vez
// por navegação — nunca re-tenta e nunca acumula redirects.
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
    // Tenant suspenso (403 tenant_suspended): a sessão é válida, então voltar
    // ao /auth só repetiria o login; a tela própria explica e oferece sair.
    if (error instanceof Error && error.message === t('tenant_suspended')) throw redirect({ to: '/suspended' });
    throw redirect({ to: '/auth' });
  }
  // Guarda única dos módulos pela matriz (AD-137): sem `ver`, volta ao início.
  const modulo = location ? moduloDaRota(location.pathname) : undefined;
  if (modulo && !can(session, modulo)) throw redirect({ to: '/' });
};

// A sessão é garantida pelo beforeLoad. O shell compartilha navegação lateral
// no desktop e mantém a dock para telas menores.
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
