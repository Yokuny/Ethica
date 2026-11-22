import { Button } from '@ethica/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { AutomationOffer } from '@/components/automation-offer.js';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { NotificationDialog } from '@/components/notification-dialog.js';
import { DEADLINE_STATUS_ITEMS } from '@/components/notification-labels.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { SuggestionsList } from '@/components/suggestions-list.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type NotificationRecord, notificationsQuery } from '@/query/notification.js';
import { can, hasAutomationSession, sessionQuery } from '@/query/session.js';
import { NewNotificationDialog } from './@components/new-notification-dialog.js';
import { NoticesList } from './@components/notices-list.js';
import { deadlineExportColumns, NotificationsTable } from './@components/notifications-table.js';
import { type NotificationsSearch, notificationsSearchSchema } from './@interface/notifications.interface.js';

type Dialog = { kind: 'create' } | { kind: 'detail'; deadline: NotificationRecord };

// Central (AD-263): the deadlines and alerts of every service, the most critical on top (AD-189).
export function NotificationsPage() {
  const search = useSearch({ strict: false }) as NotificationsSearch;
  const navigate = useNavigate({ from: '/notifications/' });
  const session = useQuery(sessionQuery).data;
  const canUpdate = Boolean(session && can(session, 'expert_cases', 'update'));
  const automation = Boolean(session && hasAutomationSession(session));
  const query = useQuery(notificationsQuery({ page: search.page, limit: search.limit, status: search.status }));
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  function update(patch: Partial<NotificationsSearch>) {
    navigate({ search: (prev: NotificationsSearch) => ({ ...prev, ...patch }), replace: true });
  }

  return (
    <Card asPage>
      <CardHeader title={t('notifications')} description={t('notifications_description')}>
        {canUpdate && search.view === 'dated' && (
          <CardAction>
            <Button onClick={() => setDialog({ kind: 'create' })}>{t('add')}</Button>
          </CardAction>
        )}
      </CardHeader>
      {/* Deadlines and alerts, or the notices (CNT-04). */}
      <Tabs
        value={search.view}
        onValueChange={(view) => update({ view: view as NotificationsSearch['view'], page: 1 })}
        className="px-(--card-spacing)"
      >
        <TabsList>
          <TabsTrigger value="dated">{t('deadlines_and_alerts')}</TabsTrigger>
          <TabsTrigger value="notices">{t('notices')}</TabsTrigger>
          {automation && <TabsTrigger value="suggestions">{t('suggestions_to_approve')}</TabsTrigger>}
        </TabsList>
      </Tabs>
      {search.view === 'suggestions' ? (
        <CardContent>
          <SuggestionsList />
        </CardContent>
      ) : search.view === 'notices' ? (
        <CardContent className="grid gap-3">
          <AutomationOffer />
          <NoticesList page={search.page} limit={search.limit} onPage={(page, limit) => update({ page, limit })} />
        </CardContent>
      ) : (
        <>
          {/* Situation tabs (AD-193): the pending ones open by default. */}
          <Tabs
            value={search.status}
            onValueChange={(status) => update({ status: status as NotificationsSearch['status'], page: 1 })}
            className="px-(--card-spacing)"
          >
            <TabsList variant="line">
              {DEADLINE_STATUS_ITEMS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <CardContent>
            <DataTable
              export={{
                title: t('deadlines_and_alerts'),
                columns: deadlineExportColumns,
                rows: items,
                fetchPage: (page, limit) =>
                  queryClient.fetchQuery(notificationsQuery({ page, limit, status: search.status })),
              }}
            >
              {query.isLoading ? (
                <DefaultLoading />
              ) : query.isError ? (
                <DefaultEmptyData
                  title={t('load_error')}
                  action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
                />
              ) : !items.length ? (
                <DefaultEmptyData title={t('no_deadlines_in_situation')} />
              ) : (
                <NotificationsTable
                  items={items}
                  pageIndex={search.page - 1}
                  pageSize={search.limit}
                  pageCount={pageCount}
                  onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, limit: pageSize })}
                  onOpen={(deadline) => setDialog({ kind: 'detail', deadline })}
                />
              )}
            </DataTable>
          </CardContent>
        </>
      )}
      {dialog?.kind === 'create' && <NewNotificationDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'detail' && <NotificationDialog deadline={dialog.deadline} onClose={() => setDialog(null)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/notifications/')({
  component: NotificationsPage,
  staticData: { title: t('notifications') },
  validateSearch: (search: Record<string, unknown>): NotificationsSearch => notificationsSearchSchema.parse(search),
});
