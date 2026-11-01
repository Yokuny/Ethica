import { REPORT_STATUS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { reportStatusLabel } from '@/components/report-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { reportsQuery } from '@/query/report.js';
import { can, sessionQuery } from '@/query/session.js';
import { ReportsTable } from './@components/reports-table.js';
import { type ReportsSearch, reportsSearchSchema } from './@interface/reports.interface.js';

const ALL = 'all';

export function ReportsListPage() {
  const search = useSearch({ strict: false }) as ReportsSearch;
  const navigate = useNavigate({ from: '/expert-reports/list/' });
  const query = useQuery(reportsQuery({ page: search.page, limit: search.limit, status: search.status }));
  const session = useQuery(sessionQuery).data;
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  function updateSearch(patch: Partial<ReportsSearch>) {
    navigate({ search: (prev: ReportsSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    updateSearch({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  return (
    <Card asPage>
      <CardHeader title={t('reports_and_opinions')}>
        {session && can(session, 'expert_reports', 'create') && (
          <CardAction>
            <Button
              nativeButton={false}
              role="link"
              render={<Link to="/expert-reports/add">{t('start_report')}</Link>}
            />
          </CardAction>
        )}
      </CardHeader>
      <Tabs
        value={search.status ?? ALL}
        onValueChange={(value) =>
          updateSearch({ status: value === ALL ? undefined : (value as ReportsSearch['status']), page: 1 })
        }
        className="px-(--card-spacing)"
      >
        <TabsList variant="line">
          <TabsTrigger value={ALL}>{t('all')}</TabsTrigger>
          {REPORT_STATUS.map((status) => (
            <TabsTrigger key={status} value={status}>
              {reportStatusLabel(status)}
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
            <DefaultEmptyData title={t('no_reports_yet')} description={t('start_report_from_expert_case')} />
          ) : (
            <ReportsTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              onRowClick={(row) => navigate({ to: '/expert-reports/details', search: { id: row.id } })}
            />
          )}
        </DataTable>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/list/')({
  component: ReportsListPage,
  staticData: { title: t('reports_and_opinions') },
  validateSearch: (search: Record<string, unknown>): ReportsSearch => reportsSearchSchema.parse(search),
});
