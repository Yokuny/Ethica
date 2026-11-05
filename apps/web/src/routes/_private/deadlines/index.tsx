import type { DeadlineStatus } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { DataTable } from '@/components/data-table.js';
import { DeadlineDialog } from '@/components/deadline-dialog.js';
import { DEADLINE_STATUS_ITEMS } from '@/components/deadline-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type DeadlineRecord, deadlinesQuery } from '@/query/deadline.js';
import { can, sessionQuery } from '@/query/session.js';
import { DeadlinesTable } from './@components/deadlines-table.js';
import { NewDeadlineDialog } from './@components/new-deadline-dialog.js';
import { type DeadlinesSearch, deadlinesSearchSchema } from './@interface/deadlines.interface.js';

type Dialog = { kind: 'create' } | { kind: 'detail'; deadline: DeadlineRecord };

// "Prazos e Alertas" (AD-189): the deadlines and alerts of every service, the most critical on top.
export function DeadlinesPage() {
  const search = useSearch({ strict: false }) as DeadlinesSearch;
  const navigate = useNavigate({ from: '/deadlines/' });
  const session = useQuery(sessionQuery).data;
  const canUpdate = Boolean(session && can(session, 'expert_cases', 'update'));
  const query = useQuery(deadlinesQuery({ page: search.page, limit: search.limit, status: search.status }));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  function update(patch: Partial<DeadlinesSearch>) {
    navigate({ search: (prev: DeadlinesSearch) => ({ ...prev, ...patch }), replace: true });
  }

  return (
    <Card asPage>
      <CardHeader title={t('deadlines_and_alerts')} description={t('deadlines_and_alerts_description')}>
        {canUpdate && (
          <CardAction>
            <Button onClick={() => setDialog({ kind: 'create' })}>{t('add')}</Button>
          </CardAction>
        )}
      </CardHeader>
      {/* Situation tabs (AD-193): the pending ones open by default. */}
      <Tabs
        value={search.status}
        onValueChange={(status) => update({ status: status as DeadlineStatus, page: 1 })}
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
        <DataTable>
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
            <DeadlinesTable
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
      {dialog?.kind === 'create' && <NewDeadlineDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'detail' && <DeadlineDialog deadline={dialog.deadline} onClose={() => setDialog(null)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/deadlines/')({
  component: DeadlinesPage,
  staticData: { title: t('deadlines_and_alerts') },
  validateSearch: (search: Record<string, unknown>): DeadlinesSearch => deadlinesSearchSchema.parse(search),
});
