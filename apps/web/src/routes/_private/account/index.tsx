import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { profileQuery } from '@/query/account.js';
import { sessionQuery } from '@/query/session.js';
import { AccountCalendarFeed } from './@components/account-calendar-feed.js';
import { AccountDevices } from './@components/account-devices.js';
import { AccountNotifications } from './@components/account-notifications.js';
import { AccountPhoto } from './@components/account-photo.js';
import { AccountProfileForm } from './@components/account-profile-form.js';

// ACC-01: the signed-in person's account, one section per subject like the office page (AD-295). Each step saves on its own; the session
// (guaranteed by the _private guard) gives the current name and photo.
export function AccountPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const { name, avatar } = session.user;
  const profile = useQuery(profileQuery);
  const sections = [
    { title: t('photo'), description: t('photo_description'), content: <AccountPhoto name={name} avatar={avatar} /> },
    {
      title: t('profile'),
      description: t('profile_description'),
      content: profile.data ? (
        <AccountProfileForm key={profile.dataUpdatedAt} profile={profile.data} />
      ) : (
        <DefaultLoading />
      ),
    },
    { title: t('devices_with_access'), description: t('devices_with_access_description'), content: <AccountDevices /> },
    { title: t('notifications'), description: t('notification_emails_description'), content: <AccountNotifications /> },
    { title: t('calendar_sync'), description: t('calendar_sync_description'), content: <AccountCalendarFeed /> },
  ];
  return (
    <Card asPage>
      <CardHeader title={t('my_account')} description={t('account_description')} />
      <CardContent className="gap-0 pb-16">
        {sections.map((section) => (
          <section
            key={section.title}
            aria-label={section.title}
            className="grid gap-4 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10"
          >
            <div className="flex flex-col gap-1">
              <ItemTitle role="heading" aria-level={2} className="text-base">
                {section.title}
              </ItemTitle>
              <ItemDescription className="line-clamp-none">{section.description}</ItemDescription>
            </div>
            <div className="min-w-0">{section.content}</div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/account/')({
  component: AccountPage,
  staticData: { title: t('my_account') },
});
