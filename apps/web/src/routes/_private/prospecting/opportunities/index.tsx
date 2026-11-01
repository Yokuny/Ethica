import { Button } from '@ethica/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { opportunitiesQuery } from '../@query/opportunity.js';
import { ConvertForm } from './@components/convert-form.js';
import { OpportunitiesTable } from './@components/opportunities-table.js';
import { useOpportunitiesPage } from './@hooks/use-opportunities-page.js';
import { type OpportunitiesSearch, opportunitiesSearchSchema } from './@interface/opportunities.interface.js';
import { OPPORTUNITY_STATUS_ITEMS } from './@utils/opportunity-status.js';

const ALL = 'all';

export function OpportunitiesPage() {
  const { search, updateSearch, handlePaginationChange, converting, setConverting, setStatus, remove, openCase } =
    useOpportunitiesPage();
  const query = useQuery(opportunitiesQuery({ page: search.page, limit: search.limit, status: search.status }));
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('opportunities')} description={t('saved_processes')}>
        <CardAction>
          <Button
            nativeButton={false}
            role="link"
            render={<Link to="/prospecting/search">{t('datajud_search')}</Link>}
          />
        </CardAction>
      </CardHeader>
      <Tabs
        value={search.status ?? ALL}
        onValueChange={(value) =>
          updateSearch({ status: value === ALL ? undefined : (value as OpportunitiesSearch['status']), page: 1 })
        }
        className="px-(--card-spacing)"
      >
        <TabsList variant="line">
          <TabsTrigger value={ALL}>{t('all')}</TabsTrigger>
          {OPPORTUNITY_STATUS_ITEMS.map((item) => (
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
            <DefaultEmptyData title={t('no_opportunities_yet')} description={t('save_processes_from_search')} />
          ) : (
            <OpportunitiesTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              onConvert={setConverting}
              onStatus={setStatus}
              onRemove={remove}
              onOpenCase={openCase}
            />
          )}
        </DataTable>
      </CardContent>
      {converting && <ConvertForm opportunity={converting} onClose={() => setConverting(null)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/prospecting/opportunities/')({
  component: OpportunitiesPage,
  staticData: { title: t('opportunities') },
  validateSearch: (search: Record<string, unknown>): OpportunitiesSearch => opportunitiesSearchSchema.parse(search),
});
