import { Button } from '@ethica/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PARTE_TIPO_ITEMS } from '@/components/parte-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partesQuery } from '@/query/parte.js';
import { ParteForm } from './@components/parte-form.js';
import { PartesTable } from './@components/partes-table.js';
import { usePartesSearch } from './@hooks/use-partes-search.js';
import { type PartesSearch, partesSearchSchema } from './@interface/partes.interface.js';

const ALL = 'all';

// Cadastro de partes e advogados reutilizáveis entre perícias (IMP-03, AD-117).
export function PartesIndexPage() {
  const { search, update, searchInput, handleSearchInput, handlePaginationChange, openParte } = usePartesSearch();
  const query = useQuery(
    partesQuery({ page: search.page, limit: search.limit, q: search.q || undefined, tipo: search.tipo }),
  );
  const [creating, setCreating] = useState(false);
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('parties')} description={t('parties_page_description')}>
        <CardAction>
          <Button onClick={() => setCreating(true)}>{t('add')}</Button>
        </CardAction>
      </CardHeader>
      <Tabs
        value={search.tipo ?? ALL}
        onValueChange={(value) =>
          update({ tipo: value === ALL ? undefined : (value as PartesSearch['tipo']), page: 1 })
        }
        className="px-(--card-spacing)"
      >
        <TabsList variant="line">
          <TabsTrigger value={ALL}>{t('all')}</TabsTrigger>
          {PARTE_TIPO_ITEMS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <CardContent>
        <DataTable search={{ value: searchInput, onChange: handleSearchInput }}>
          {query.isLoading ? (
            <DefaultLoading />
          ) : query.isError ? (
            <DefaultEmptyData
              title={t('load_error')}
              action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
            />
          ) : !items.length ? (
            <DefaultEmptyData
              title={search.q ? t('no_records_match_filters') : t('no_parties_yet')}
              description={search.q ? undefined : t('parties_are_created_with_expert_cases')}
            />
          ) : (
            <PartesTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              onRowClick={openParte}
            />
          )}
        </DataTable>
      </CardContent>
      {creating && <ParteForm onClose={() => setCreating(false)} onSaved={openParte} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/partes/')({
  component: PartesIndexPage,
  staticData: { title: t('parties') },
  validateSearch: (search: Record<string, unknown>): PartesSearch => partesSearchSchema.parse(search),
});
