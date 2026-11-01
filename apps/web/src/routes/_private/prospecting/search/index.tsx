import { Button } from '@ethica/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { SearchForm } from './@components/search-form.js';
import { SearchResults } from './@components/search-results.js';
import { useSearchDatajud } from './@hooks/use-search-datajud.js';

export function SearchDatajudPage() {
  const state = useSearchDatajud();
  const { searched, items, hasMore, loadMore, isSearching, searchError, saveItem, isSaving } = state;

  return (
    <Card asPage>
      <CardHeader title={t('datajud_search')} description={t('datajud_search_description')} />
      <CardContent className="gap-8">
        <Panel>
          <SearchForm state={state} />
        </Panel>
        <DataTable>
          {isSearching && !items.length ? (
            <DefaultLoading />
          ) : searchError ? (
            <DefaultEmptyData title={searchError} />
          ) : !searched ? (
            <DefaultEmptyData title={t('search_datajud_to_start')} description={t('datajud_search_hint')} />
          ) : !items.length ? (
            <DefaultEmptyData title={t('no_processes_found')} />
          ) : (
            <SearchResults items={items} onSave={saveItem} saving={isSaving} />
          )}
        </DataTable>
        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" disabled={isSearching} onClick={loadMore}>
              {t('load_more')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/prospecting/search/')({
  component: SearchDatajudPage,
  staticData: { title: t('datajud_search') },
});
