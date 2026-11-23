import { Badge, BadgeIndicator } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { NotificationDialog } from '@/components/notification-dialog.js';
import { NotificationForm } from '@/components/notification-form.js';
import { ALERT_VARIANT, DEADLINE_STATUS_VARIANT, deadlineAlert } from '@/components/notification-labels.js';
import { Panel } from '@/components/panel.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseNotificationsQuery, type DatedNotificationRecord } from '@/query/notification.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

type DeadlinePanel =
  | { kind: 'create' }
  | { kind: 'edit'; deadline: DatedNotificationRecord }
  | { kind: 'detail'; deadline: DatedNotificationRecord }
  | null;

// Every deadline and alert (AD-189) of the process (PRZ-01), by due date: pending ones with an overdue/due soon
// alert, filed ones with the delivery date, missed ones in the history.
export function CaseNotifications({ caseId }: { caseId: string }) {
  const query = useQuery(caseNotificationsQuery(caseId));
  const [panel, setPanel] = useState<DeadlinePanel>(null);
  const today = formatDisplayDate(new Date());

  return (
    <Panel
      collapsible
      icon={<CalendarClock />}
      size="sm"
      title={t('deadlines')}
      empty={query.isSuccess && !query.data.length}
      actions={
        <Button variant="outline" onClick={() => setPanel({ kind: 'create' })}>
          {t('add_deadline')}
        </Button>
      }
    >
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.length ? (
        <DefaultEmptyData title={t('no_deadlines_yet')} />
      ) : (
        <LinkList>
          {query.data.map((deadline) => {
            const alert = deadlineAlert(deadline, today);
            return (
              <LinkListItem
                key={deadline.id}
                icon={CalendarClock}
                render={<button type="button" onClick={() => setPanel({ kind: 'detail', deadline })} />}
                title={deadline.title}
                badges={
                  <>
                    {deadline.kind === 'alert' && <Badge variant="secondary">{t('alert')}</Badge>}
                    <Badge variant={DEADLINE_STATUS_VARIANT[deadline.status]}>{t(deadline.status)}</Badge>
                    {alert && (
                      <Badge variant={ALERT_VARIANT[alert]}>
                        <BadgeIndicator variant={ALERT_VARIANT[alert]} />
                        {t(alert)}
                      </Badge>
                    )}
                  </>
                }
                description={[
                  `${t('due_on')} ${day(deadline.dueDate)}`,
                  deadline.filedDate && `${t('filed_on')} ${day(deadline.filedDate)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            );
          })}
        </LinkList>
      )}
      {panel?.kind === 'create' && <NotificationForm caseId={caseId} onClose={() => setPanel(null)} />}
      {panel?.kind === 'edit' && (
        <NotificationForm caseId={caseId} deadline={panel.deadline} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'detail' && (
        <NotificationDialog
          deadline={panel.deadline}
          onClose={() => setPanel(null)}
          onEdit={() => setPanel({ kind: 'edit', deadline: panel.deadline })}
        />
      )}
    </Panel>
  );
}
