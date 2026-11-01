import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { casesQuery } from '@/query/case.js';
import { listStatsQuery } from '@/query/listStats.js';
import { can, sessionQuery } from '@/query/session.js';
import { CasesFilters } from './@components/cases-filters.js';
import { CasesOverview } from './@components/cases-overview.js';
import { CasesTable } from './@components/cases-table.js';
import { useCasesSearch } from './@hooks/use-cases-search.js';
import { type CasesSearch, casesSearchSchema } from './@interface/cases.interface.js';

export function CasesIndexPage() {
  const {
    search,
    searchInput,
    handleSearchInput,
    handlePaginationChange,
    handleRowClick,
    update,
    activeFilters,
    hasFilters,
    clearFilters,
  } = useCasesSearch();
  const query = useQuery(
    casesQuery({
      page: search.page,
      limit: search.limit,
      q: search.q || undefined,
      status: search.status,
      state: search.state,
      phase: search.phase,
      courtType: search.courtType,
    }),
  );
  const statsQuery = useQuery(listStatsQuery('/expert-cases/stats'));
  const session = useQuery(sessionQuery).data;
  const canCreate = Boolean(session && can(session, 'expert_cases', 'create'));
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('expert_cases')} description={t('track_each_expert_case_from_appointment_to_report')}>
        {canCreate && (
          <CardAction>
            <Button
              variant="outline"
              nativeButton={false}
              role="link"
              render={<Link to="/expert-cases/import">{t('import_spreadsheet')}</Link>}
            />
            <Button nativeButton={false} role="link" render={<Link to="/expert-cases/add">{t('add')}</Link>} />
          </CardAction>
        )}
      </CardHeader>
      <CasesOverview stats={statsQuery.data} />
      <CardContent>
        <DataTable
          search={{ value: searchInput, onChange: handleSearchInput }}
          filters={{ content: <CasesFilters search={search} onChange={update} />, active: activeFilters }}
        >
          {query.isLoading ? (
            <DefaultLoading />
          ) : query.isError ? (
            <DefaultEmptyData
              title={t('load_error')}
              action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
            />
          ) : !items.length ? (
            hasFilters ? (
              <DefaultEmptyData
                title={t('no_records_match_filters')}
                action={<Button onClick={clearFilters}>{t('clear_filters')}</Button>}
              />
            ) : (
              <DefaultEmptyData title={t('no_expert_cases_yet')} description={t('use_add_to_create_first')} />
            )
          ) : (
            <CasesTable
              canSeeFinance={Boolean(session && can(session, 'finance'))}
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              onRowClick={handleRowClick}
            />
          )}
        </DataTable>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-cases/')({
  component: CasesIndexPage,
  staticData: { title: t('expert_cases') },
  validateSearch: (search: Record<string, unknown>): CasesSearch => casesSearchSchema.parse(search),
});
