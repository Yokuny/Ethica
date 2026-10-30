import { createFileRoute } from '@tanstack/react-router';
import { Card } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { InviteForm } from './@components/invite-form.js';
import { usersAddSearchSchema } from './@interface/users-add.interface.js';

export function UserInvitePage() {
  return (
    <Card asPage>
      <InviteForm />
    </Card>
  );
}

export const Route = createFileRoute('/_private/_admin/users/add/')({
  component: UserInvitePage,
  staticData: { title: t('invite_person') },
  validateSearch: (search: Record<string, unknown>) => usersAddSearchSchema.parse(search),
});
