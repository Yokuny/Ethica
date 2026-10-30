import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { InviteForm } from './@components/invite-form.js';
import { useInviteForm } from './@hooks/use-invite-form.js';
import { inviteSearchSchema } from './@interface/invite.interface.js';
import { invitePeekQuery } from './@query/invite.js';

export function InvitePage() {
  const { token } = useSearch({ strict: false }) as { token?: string };
  const peekQuery = useQuery({ ...invitePeekQuery(token ?? ''), enabled: Boolean(token), retry: false });
  const { form, submitError, onSubmit } = useInviteForm(token ?? '');

  return (
    <Card asPage="public">
      <CardHeader className="mx-auto w-full max-w-sm" title={t('accept_invite')} />
      <CardContent className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {!token ? (
          <div role="alert">
            <DefaultEmptyData title={t('invalid_link')} />
          </div>
        ) : peekQuery.isPending ? (
          <DefaultLoading />
        ) : peekQuery.isError ? (
          <div role="alert">
            <DefaultEmptyData
              title={peekQuery.error instanceof Error ? peekQuery.error.message : t('invalid_link')}
              action={<Button onClick={() => void peekQuery.refetch()}>{t('try_again')}</Button>}
            />
          </div>
        ) : (
          <InviteForm
            form={form}
            tenantName={peekQuery.data.tenantName}
            email={peekQuery.data.email}
            submitError={submitError}
            onSubmit={onSubmit}
          />
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/invite/')({
  validateSearch: (search: Record<string, unknown>) => inviteSearchSchema.parse(search),
  staticData: { title: t('accept_invite') },
  component: InvitePage,
});
