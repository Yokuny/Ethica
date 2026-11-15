import { Button } from '@ethica/ui/components/button';
import { DropdownMenuItem } from '@ethica/ui/components/dropdown-menu';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { UsersList } from './@components/users-list.js';

import { useUsersPage } from './@hooks/use-users-page.js';
export function UsersPage() {
  const { query } = useUsersPage();
  const navigate = useNavigate();
  return (
    <Card asPage>
      <CardHeader title={t('users')} description={t('review_people_and_invite_to_team')}>
        <CardAction>
          <Button nativeButton={false} role="link" render={<Link to="/users/add">{t('invite_person')}</Link>} />
          <PageMenu>
            <DropdownMenuItem onClick={() => navigate({ to: '/account' })}>{t('my_account')}</DropdownMenuItem>
          </PageMenu>
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
