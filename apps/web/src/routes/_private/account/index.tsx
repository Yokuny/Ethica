import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { sessionQuery } from '@/query/session.js';
import { AccountCalendarFeed } from './@components/account-calendar-feed.js';
import { AccountDeadlineReminder } from './@components/account-deadline-reminder.js';
import { AccountPasswordForm } from './@components/account-password-form.js';
import { AccountPhoto } from './@components/account-photo.js';
import { AccountProfileForm } from './@components/account-profile-form.js';
import { profileQuery } from './@query/account.js';

// ACC-01: a conta de quem está logado. Cada bloco salva sozinho; a sessão
// (garantida pelo guard de _private) dá nome e foto atuais.
export function AccountPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const { name, avatar } = session.user;
  const profile = useQuery(profileQuery);
  return (
    <Card asPage>
      <CardHeader title={t('my_account')} description={t('account_description')} />
      <CardContent>
        <DefaultFormLayout
          sections={[
            {
              title: t('photo'),
              description: t('photo_description'),
              fields: [<AccountPhoto key="photo" name={name} avatar={avatar} />],
            },
            {
              title: t('profile'),
              description: t('profile_description'),
              fields: [
                profile.data ? (
                  <AccountProfileForm key={profile.dataUpdatedAt} profile={profile.data} />
                ) : (
                  <DefaultLoading key="profile" />
                ),
              ],
            },
            {
              title: t('password'),
              description: t('change_password_description'),
              fields: [<AccountPasswordForm key="password" />],
            },
            {
              title: t('deadline_alerts'),
              description: t('deadline_alerts_description'),
              fields: [<AccountDeadlineReminder key="notice" />],
            },
            {
              title: t('calendar_sync'),
              description: t('calendar_sync_description'),
              fields: [<AccountCalendarFeed key="feed" />],
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/account/')({
  component: AccountPage,
  staticData: { title: t('my_account') },
});
