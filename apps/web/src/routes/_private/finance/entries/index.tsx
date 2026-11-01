import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { financeSummaryQuery, transactionsQuery } from '@/query/transaction.js';
import { FinanceOverview } from './@components/finance-overview.js';
import { ReceiptForm } from './@components/receipt-form.js';
import { TransactionForm } from './@components/transaction-form.js';
import { TransactionsFilters } from './@components/transactions-filters.js';
import { TransactionsTable } from './@components/transactions-table.js';
import { useTransactionsPage } from './@hooks/use-transactions-page.js';
import { type TransactionsSearch, transactionsSearchSchema } from './@interface/transactions.interface.js';

export function TransactionsIndexPage() {
  const { search, update, panel, setPanel, handlePaginationChange, setStatus, activeFilters, clearFilters } =
    useTransactionsPage();
  const query = useQuery(transactionsQuery(search));
  const summary = useQuery(financeSummaryQuery);
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
      <FinanceOverview summary={summary.data} />
      <CardContent>
        <DataTable toolbar={<TransactionsFilters search={search} onChange={update} />}>
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
            <TransactionsTable
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              onRowClick={(transaction) => setPanel({ kind: 'edit', transaction })}
              onStatus={setStatus}
              onReceive={(transaction) => setPanel({ kind: 'receive', transaction })}
            />
          )}
        </DataTable>
      </CardContent>
      {panel?.kind === 'create' && <TransactionForm onClose={() => setPanel(null)} />}
      {panel?.kind === 'edit' && <TransactionForm transaction={panel.transaction} onClose={() => setPanel(null)} />}
      {panel?.kind === 'receive' && <ReceiptForm transaction={panel.transaction} onClose={() => setPanel(null)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/finance/entries/')({
  component: TransactionsIndexPage,
  staticData: { title: t('entries') },
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => transactionsSearchSchema.parse(search),
});
