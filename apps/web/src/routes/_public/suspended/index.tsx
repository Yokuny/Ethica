import { Button } from '@ethica/ui/components/button';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { clearDevice } from '@/lib/offline/store.js';

// Destino do guard de _private quando GET /auth/session responde
// `tenant_suspended`. Sair não passa por validToken, então funciona mesmo com
// o tenant suspenso.
export function SuspendedPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await post('/auth/signout');
    queryClient.clear();
    void clearDevice();
    navigate({ to: '/auth' });
  };

  return (
    <Card asPage="public">
      <CardHeader className="mx-auto w-full max-w-sm" title={t('tenant_suspended')} />
      <CardContent className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <DefaultEmptyData
          title={t('tenant_suspended')}
          description={t('tenant_suspended_help')}
          action={<Button onClick={() => void signOut()}>{t('sign_out')}</Button>}
        />
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/suspended/')({
  component: SuspendedPage,
  staticData: { title: t('tenant_suspended') },
});
