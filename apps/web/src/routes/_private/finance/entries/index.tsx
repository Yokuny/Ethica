import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { financeiroResumoQuery, lancamentosQuery } from '@/query/lancamento.js';
import { can, sessionQuery } from '@/query/session.js';
import { FinanceiroOverview } from './@components/financeiro-overview.js';
import { LancamentoForm } from './@components/lancamento-form.js';
import { LancamentosFilters } from './@components/lancamentos-filters.js';
import { LancamentosTable } from './@components/lancamentos-table.js';
import { RecebimentoForm } from './@components/recebimento-form.js';
import { useLancamentosPage } from './@hooks/use-lancamentos-page.js';
import { type LancamentosSearch, lancamentosSearchSchema } from './@interface/lancamentos.interface.js';

export function LancamentosIndexPage() {
  const { search, update, panel, setPanel, handlePaginationChange, setStatus, activeFilters, clearFilters } =
    useLancamentosPage();
  const query = useQuery(lancamentosQuery(search));
  const resumo = useQuery(financeiroResumoQuery);
  const session = useQuery(sessionQuery).data;
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('entries')} description={t('receivable_and_expenses')}>
        {session && can(session, 'finance', 'create') && (
          <CardAction>
            <Button onClick={() => setPanel({ kind: 'create' })}>{t('add')}</Button>
          </CardAction>
        )}
      </CardHeader>
      <FinanceiroOverview resumo={resumo.data} />
      <CardContent>
        <DataTable toolbar={<LancamentosFilters search={search} onChange={update} />}>
          {query.isLoading ? (
            <DefaultLoading />
          ) : query.isError ? (
            <DefaultEmptyData
              title={t('load_error')}
              action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
            />
          ) : !items.length ? (
            activeFilters ? (
              <DefaultEmptyData
                title={t('no_records_match_filters')}
                action={<Button onClick={clearFilters}>{t('clear_filters')}</Button>}
              />
            ) : (
              <DefaultEmptyData title={t('no_entries_yet')} description={t('use_add_to_create_first')} />
            )
          ) : (
            <LancamentosTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              onRowClick={(lancamento) => setPanel({ kind: 'edit', lancamento })}
              onStatus={setStatus}
              onReceber={(lancamento) => setPanel({ kind: 'receber', lancamento })}
            />
          )}
        </DataTable>
      </CardContent>
      {panel?.kind === 'create' && <LancamentoForm onClose={() => setPanel(null)} />}
      {panel?.kind === 'edit' && <LancamentoForm lancamento={panel.lancamento} onClose={() => setPanel(null)} />}
      {panel?.kind === 'receber' && <RecebimentoForm lancamento={panel.lancamento} onClose={() => setPanel(null)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/finance/entries/')({
  component: LancamentosIndexPage,
  staticData: { title: t('entries') },
  validateSearch: (search: Record<string, unknown>): LancamentosSearch => lancamentosSearchSchema.parse(search),
});
