import { Button } from '@ethica/ui/components/button';
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel } from '@ethica/ui/components/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { ActivityLogTable } from './@components/activity-log-table.js';
import { activityLogPresets } from './@consts/activity-log-presets.js';
import { useActivityLogFilters } from './@hooks/use-activity-log-filters.js';
import { useActivityLogSearch } from './@hooks/use-activity-log-search.js';
import { type ActivityLogSearch, activityLogSearchSchema } from './@interface/activityLog.interface.js';
import { activityLogQuery } from './@query/activityLog.js';
import { activityLogExportColumns } from './@utils/activity-log-columns.js';

// Activity log (GES-01, AD-134): who did what, admin only.
export function ActivityLogPage() {
  const { search, update, handlePaginationChange, active } = useActivityLogSearch();
  const filters = useActivityLogFilters(search, update);
  const query = useQuery(activityLogQuery(search));
  const queryClient = useQueryClient();
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('activity_log')} description={t('activity_log_page_description')}>
        <CardAction>
          <PageMenu>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('ready_made_filters')}</DropdownMenuLabel>
              {activityLogPresets().map((preset) => (
                <DropdownMenuItem key={preset.label} onClick={() => update({ ...preset.filters, page: 1 })}>
                  {t(preset.label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </PageMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        <DataTable
          filters={{ items: filters }}
          export={{
            title: t('activity_log'),
            columns: activityLogExportColumns,
            rows: items,
            fetchPage: (page, limit) => queryClient.fetchQuery(activityLogQuery({ ...search, page, limit })),
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
