import { Button } from '@ethica/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { BuscaForm } from './@components/busca-form.js';
import { BuscaResults } from './@components/busca-results.js';
import { useBuscaDatajud } from './@hooks/use-busca-datajud.js';

export function BuscaDatajudPage() {
  const state = useBuscaDatajud();
  const { searched, items, hasMore, loadMore, isSearching, searchError, saveItem, isSaving } = state;

  return (
    <Card asPage>
      <CardHeader title={t('datajud_search')} description={t('datajud_search_description')} />
      <CardContent className="gap-8">
        <Panel>
          <BuscaForm state={state} />
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
            <BuscaResults items={items} onSave={saveItem} saving={isSaving} />
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

export const Route = createFileRoute('/_private/prospeccao/busca/')({
  component: BuscaDatajudPage,
  staticData: { title: t('datajud_search') },
});
