import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { ActivityLogFilters } from './@components/activity-log-filters.js';
import { ActivityLogTable } from './@components/activity-log-table.js';
import { useActivityLogSearch } from './@hooks/use-activity-log-search.js';
import { type ActivityLogSearch, activityLogSearchSchema } from './@interface/activityLog.interface.js';
import { activityLogQuery } from './@query/activityLog.js';

// Diário de bordo (GES-01, AD-134): quem fez o quê, só para o admin.
export function ActivityLogPage() {
  const { search, update, handlePaginationChange, active } = useActivityLogSearch();
  const query = useQuery(activityLogQuery(search));
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('activity_log')} description={t('activity_log_page_description')} />
      <CardContent>
        <DataTable filters={{ content: <ActivityLogFilters search={search} onChange={update} />, active }}>
          {query.isLoading ? (
            <DefaultLoading />
          ) : query.isError ? (
            <DefaultEmptyData
              title={t('load_error')}
              action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
            />
          ) : !items.length ? (
            <DefaultEmptyData
              title={active ? t('no_records_match_filters') : t('no_activity_yet')}
              description={active ? undefined : t('activity_appears_here')}
            />
          ) : (
            <ActivityLogTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
            />
          )}
        </DataTable>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/_admin/activity-log/')({
  component: ActivityLogPage,
  staticData: { title: t('activity_log') },
  validateSearch: (search: Record<string, unknown>): ActivityLogSearch => activityLogSearchSchema.parse(search),
});
