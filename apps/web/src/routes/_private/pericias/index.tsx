import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { listStatsQuery } from '@/query/listStats.js';
import { periciasQuery } from '@/query/pericia.js';
import { PericiasFilters } from './@components/pericias-filters.js';
import { PericiasOverview } from './@components/pericias-overview.js';
import { PericiasTable } from './@components/pericias-table.js';
import { usePericiasSearch } from './@hooks/use-pericias-search.js';
import { type PericiasSearch, periciasSearchSchema } from './@interface/pericias.interface.js';

export function PericiasIndexPage() {
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
  } = usePericiasSearch();
  const query = useQuery(
    periciasQuery({
      page: search.page,
      limit: search.limit,
      q: search.q || undefined,
      status: search.status,
      justica: search.justica,
    }),
  );
  const statsQuery = useQuery(listStatsQuery('/pericias/stats'));
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('expert_cases')} description={t('track_each_expert_case_from_appointment_to_report')}>
        <CardAction>
          <Button nativeButton={false} role="link" render={<Link to="/pericias/add">{t('add')}</Link>} />
        </CardAction>
      </CardHeader>
      <PericiasOverview stats={statsQuery.data} />
      <CardContent>
        <DataTable
          search={{ value: searchInput, onChange: handleSearchInput }}
          filters={{ content: <PericiasFilters search={search} onChange={update} />, active: activeFilters }}
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
            <PericiasTable
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

export const Route = createFileRoute('/_private/pericias/')({
  component: PericiasIndexPage,
  staticData: { title: t('expert_cases') },
  validateSearch: (search: Record<string, unknown>): PericiasSearch => periciasSearchSchema.parse(search),
});
