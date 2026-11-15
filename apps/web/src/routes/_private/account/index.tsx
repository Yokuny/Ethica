import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { StepItem, StepList } from '@/components/step-list.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { profileQuery } from '@/query/account.js';
import { sessionQuery } from '@/query/session.js';
import { AccountCalendarFeed } from './@components/account-calendar-feed.js';
import { AccountDeadlineReminder } from './@components/account-deadline-reminder.js';
import { AccountDevices } from './@components/account-devices.js';
import { AccountPhoto } from './@components/account-photo.js';
import { AccountProfileForm } from './@components/account-profile-form.js';

// ACC-01: the signed-in person's account, in steps like the office page (AD-224). Each step saves on its own; the session
// (guaranteed by the _private guard) gives the current name and photo.
export function AccountPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const { name, avatar } = session.user;
  const profile = useQuery(profileQuery);
  return (
    <Card asPage>
      <CardHeader title={t('my_account')} />
      <CardContent>
        <StepList title={t('you_in_every_routine')} description={t('account_description')}>
          <StepItem title={t('photo')} description={t('photo_description')}>
            <AccountPhoto name={name} avatar={avatar} />
          </StepItem>
          <StepItem title={t('profile')} description={t('profile_description')}>
            {profile.data ? (
              <AccountProfileForm key={profile.dataUpdatedAt} profile={profile.data} />
            ) : (
              <DefaultLoading />
            )}
          </StepItem>
          <StepItem title={t('devices_with_access')} description={t('devices_with_access_description')}>
            <AccountDevices />
          </StepItem>
          <StepItem title={t('deadline_alerts')} description={t('deadline_alerts_description')}>
            <AccountDeadlineReminder />
          </StepItem>
          <StepItem title={t('calendar_sync')} description={t('calendar_sync_description')}>
            <AccountCalendarFeed />
          </StepItem>
        </StepList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/account/')({
  component: AccountPage,
  staticData: { title: t('my_account') },
});
