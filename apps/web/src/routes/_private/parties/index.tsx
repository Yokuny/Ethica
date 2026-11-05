import { Button } from '@ethica/ui/components/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PARTY_TYPE_ITEMS } from '@/components/party-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { mergeDuplicatePartiesMutation, partiesQuery } from '@/query/party.js';
import { can, isAdminSession, sessionQuery } from '@/query/session.js';
import { PartiesTable } from './@components/parties-table.js';
import { PartyForm } from './@components/party-form.js';
import { usePartiesSearch } from './@hooks/use-parties-search.js';
import { type PartiesSearch, partiesSearchSchema } from './@interface/parties.interface.js';

// Registry of parties and lawyers reusable across cases (IMP-03, AD-117).
export function PartiesIndexPage() {
  const {
    search,
    update,
    searchInput,
    handleSearchInput,
    handlePaginationChange,
    sorting,
    handleSortingChange,
    openParty,
  } = usePartiesSearch();
  const query = useQuery(
    partiesQuery({
      page: search.page,
      limit: search.limit,
      q: search.q || undefined,
      type: search.type,
      sort: search.sort,
      order: search.order,
    }),
  );
  const [creating, setCreating] = useState(false);
  const session = useQuery(sessionQuery).data;
  const queryClient = useQueryClient();
  const merge = useMutation(mergeDuplicatePartiesMutation(queryClient));
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('parties')} description={t('parties_page_description')}>
        {session && (isAdminSession(session) || can(session, 'parties', 'create')) && (
          <CardAction>
            {isAdminSession(session) && (
              <Button
                variant="outline"
                disabled={merge.isPending}
                onClick={() =>
                  merge.mutate(undefined, {
                    onSuccess: ({ merged }) =>
                      toast.success(merged ? `${merged} ${t('duplicates_merged')}` : t('no_duplicates_found')),
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                {t('merge_duplicates')}
              </Button>
            )}
            {can(session, 'parties', 'create') && <Button onClick={() => setCreating(true)}>{t('add')}</Button>}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <DataTable
          search={{ value: searchInput, onChange: handleSearchInput }}
          filters={{
            options: {
              label: t('type'),
              items: PARTY_TYPE_ITEMS,
              value: search.type,
              onChange: (type) => update({ type: type as PartiesSearch['type'], page: 1 }),
            },
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
              title={search.q || search.type ? t('no_records_match_filters') : t('no_parties_yet')}
              description={search.q || search.type ? undefined : t('parties_are_created_with_expert_cases')}
            />
          ) : (
            <PartiesTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              sorting={sorting}
              onSortingChange={handleSortingChange}
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
