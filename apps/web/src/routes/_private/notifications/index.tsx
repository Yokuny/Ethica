import { NOTIFICATION_KINDS, NOTIFICATION_STATES } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { AutomationOffer } from '@/components/automation-offer.js';
import { DataTable, periodSummary, type TableFilterItem } from '@/components/data-table.js';
import { DatePicker } from '@/components/date-picker.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { NotificationDialog } from '@/components/notification-dialog.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type DatedNotificationRecord, notificationsQuery } from '@/query/notification.js';
import { can, sessionQuery } from '@/query/session.js';
import { NewNotificationDialog } from './@components/new-notification-dialog.js';
import { NotificationsTable, notificationExportColumns } from './@components/notifications-table.js';
import { type NotificationsSearch, notificationsSearchSchema } from './@interface/notifications.interface.js';

const STATE_LABEL = { open: 'open_plural', resolved: 'resolved_plural' } as const;
const STATE_VARIANT = { open: 'warning', resolved: 'success' } as const;

type Dialog = { kind: 'create' } | { kind: 'detail'; item: DatedNotificationRecord };

// Notifications (AD-282): one list of everything that asks for someone — deadlines, alerts, suggestions and
// notices — open until someone acts on it, the oldest day on top.
export function NotificationsPage() {
  const search = useSearch({ strict: false }) as NotificationsSearch;
  const navigate = useNavigate({ from: '/notifications/' });
  const session = useQuery(sessionQuery).data;
  const canAdd = Boolean(session && can(session, 'expert_cases', 'update'));
  const params = {
    page: search.page,
    limit: search.limit,
    state: search.state,
    kind: search.kind,
    from: search.from,
    to: search.to,
  };
  const filtered = Boolean(search.kind || search.from || search.to);
  // The previous page stays while the next tab loads, so the counts beside the tabs do not blink.
  const query = useQuery({ ...notificationsQuery(params), placeholderData: keepPreviousData });
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  function update(patch: Partial<NotificationsSearch>) {
    navigate({ search: (prev: NotificationsSearch) => ({ ...prev, ...patch }), replace: true });
  }

  // "Filtros" (FIL-01): the kind (several at once) and the period of the day each one is about.
  const filters: TableFilterItem[] = [
    {
      label: t('type'),
      items: NOTIFICATION_KINDS.map((kind) => ({ value: kind, label: t(kind) })),
      value: search.kind,
      onChange: (kind) => update({ kind: kind as NotificationsSearch['kind'], page: 1 }),
    },
    {
      label: t('period'),
      summary: periodSummary(search.from, search.to),
      content: (
        <div className="grid grid-cols-2 gap-2">
          <DatePicker value={search.from} placeholder={t('from')} onChange={(from) => update({ from, page: 1 })} />
          <DatePicker value={search.to} placeholder={t('to')} onChange={(to) => update({ to, page: 1 })} />
        </div>
      ),
    },
  ];

  return (
    <Card asPage>
      <CardHeader title={t('notifications')} description={t('notifications_description')}>
        <CardAction>{canAdd && <Button onClick={() => setDialog({ kind: 'create' })}>{t('add')}</Button>}</CardAction>
      </CardHeader>
      <Tabs
        value={search.state}
        onValueChange={(state) => update({ state: state as NotificationsSearch['state'], page: 1 })}
        className="px-(--card-spacing)"
      >
        <TabsList variant="line">
          {NOTIFICATION_STATES.map((state) => (
            <TabsTrigger key={state} value={state}>
              {t(STATE_LABEL[state])}
              {query.data?.counts && <Badge variant={STATE_VARIANT[state]}>{query.data.counts[state]}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <CardContent className="grid gap-3">
        <AutomationOffer />
        <DataTable
          filters={{ items: filters }}
          export={{
            title: t('notifications'),
            columns: notificationExportColumns,
            rows: items,
            fetchPage: (page, limit) => queryClient.fetchQuery(notificationsQuery({ ...params, page, limit })),
          }}
        >
          {query.isLoading ? (
            <DefaultLoading />
          ) : query.isError ? (
            <DefaultEmptyData
              title={t('load_error')}
              action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
            />
          ) : !items.length && filtered ? (
            <DefaultEmptyData
              title={t('no_records_match_filters')}
              action={
                <Button onClick={() => update({ kind: undefined, from: undefined, to: undefined, page: 1 })}>
                  {t('clear_filters')}
                </Button>
              }
            />
          ) : !items.length ? (
            <DefaultEmptyData title={t('no_notifications')} />
          ) : (
            <NotificationsTable
              items={items}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              pageCount={pageCount}
              onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, limit: pageSize })}
              onOpen={(item) => setDialog({ kind: 'detail', item })}
            />
          )}
        </DataTable>
      </CardContent>
      {dialog?.kind === 'create' && <NewNotificationDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'detail' && <NotificationDialog deadline={dialog.item} onClose={() => setDialog(null)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/notifications/')({
  component: NotificationsPage,
  staticData: { title: t('notifications') },
  validateSearch: (search: Record<string, unknown>): NotificationsSearch => notificationsSearchSchema.parse(search),
});
