import { Button } from '@ethica/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PARTY_TYPE_ITEMS } from '@/components/party-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partiesQuery } from '@/query/party.js';
import { can, sessionQuery } from '@/query/session.js';
import { PartiesTable } from './@components/parties-table.js';
import { PartyForm } from './@components/party-form.js';
import { usePartiesSearch } from './@hooks/use-parties-search.js';
import { type PartiesSearch, partiesSearchSchema } from './@interface/parties.interface.js';

const ALL = 'all';

// Registry of parties and lawyers reusable across cases (IMP-03, AD-117).
export function PartiesIndexPage() {
  const { search, update, searchInput, handleSearchInput, handlePaginationChange, openParty } = usePartiesSearch();
  const query = useQuery(
    partiesQuery({ page: search.page, limit: search.limit, q: search.q || undefined, type: search.type }),
  );
  const [creating, setCreating] = useState(false);
  const session = useQuery(sessionQuery).data;
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('parties')} description={t('parties_page_description')}>
        {session && can(session, 'parties', 'create') && (
          <CardAction>
            <Button onClick={() => setCreating(true)}>{t('add')}</Button>
          </CardAction>
        )}
      </CardHeader>
      <Tabs
        value={search.type ?? ALL}
        onValueChange={(value) =>
          update({ type: value === ALL ? undefined : (value as PartiesSearch['type']), page: 1 })
        }
        className="px-(--card-spacing)"
      >
        <TabsList variant="line">
          <TabsTrigger value={ALL}>{t('all')}</TabsTrigger>
          {PARTY_TYPE_ITEMS.map((item) => (
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
            <PartiesTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              onRowClick={openParty}
            />
          )}
        </DataTable>
      </CardContent>
      {creating && <PartyForm onClose={() => setCreating(false)} onSaved={openParty} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/parties/')({
  component: PartiesIndexPage,
  staticData: { title: t('parties') },
  validateSearch: (search: Record<string, unknown>): PartiesSearch => partiesSearchSchema.parse(search),
});
