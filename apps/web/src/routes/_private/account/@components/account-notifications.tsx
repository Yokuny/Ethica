import type { NotificationPreferenceTopic } from '@ethica/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Checkbox } from '@/components/checkbox.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { preferencesQuery, updatePreferencesMutation } from '@/query/preferences.js';
import { can, sessionQuery } from '@/query/session.js';

// CNT-05: each person chooses which notifications reach them by e-mail (everything starts on). The
// finance line only shows for whoever sees finance (D5); court and suggestions come with the automation.
export function AccountNotifications() {
  const queryClient = useQueryClient();
  const query = useQuery(preferencesQuery);
  const session = useQuery(sessionQuery).data;
  const mutation = useMutation(updatePreferencesMutation(queryClient));

  if (query.isLoading || !query.data) return <DefaultLoading />;
  const topics: { topic: NotificationPreferenceTopic; label: string }[] = [
    { topic: 'deadlines', label: t('deadline_email_alert') },
    ...(session && can(session, 'finance', 'view')
      ? [{ topic: 'finance' as const, label: t('finance_email_alert') }]
      : []),
  ];

  return (
    <div className="grid gap-3">
      {topics.map(({ topic, label }) => (
        <Checkbox
          key={topic}
          label={label}
          checked={query.data.notifications[topic].email}
          disabled={mutation.isPending}
          onCheckedChange={(checked) =>
            mutation.mutate(
              { notifications: { [topic]: { email: checked } } },
              { onError: (error: Error) => toast.error(error.message) },
            )
          }
        />
      ))}
    </div>
  );
}
