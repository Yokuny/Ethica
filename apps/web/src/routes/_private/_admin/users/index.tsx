import { Button } from '@ethica/ui/components/button';
import { createFileRoute, Link } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { UsersList } from './@components/users-list.js';

import { useUsersPage } from './@hooks/use-users-page.js';
export function UsersPage() {
  const { query } = useUsersPage();
  return (
    <Card asPage>
      <CardHeader title={t('users')} description={t('review_people_and_invite_to_team')}>
        <CardAction>
          <Button nativeButton={false} role="link" render={<Link to="/users/add">{t('invite_person')}</Link>} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => query.refetch()}>{t('try_again')}</Button>}
          />
        ) : query.data.length === 0 ? (
          <DefaultEmptyData description={t('invite_people_to_start')} />
        ) : (
          <UsersList users={query.data} />
        )}
      </CardContent>
    </Card>
  );
}
export const Route = createFileRoute('/_private/_admin/users/')({
  component: UsersPage,
  staticData: { title: t('users') },
});
