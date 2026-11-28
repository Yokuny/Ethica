import { Button } from '@ethica/ui/components/button';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { AppLink } from '@/components/app-link.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { ReceiptForm } from '@/components/receipt-form.js';
import { RecordHeader, RecordHeading, RecordStat, RecordStats, RecordStatus } from '@/components/record.js';
import { SuggestionButton, suggestionsFor, useCaseSuggestions } from '@/components/suggestion-button.js';
import { categoryLabel, STATE_VARIANT, stateLabel, transactionState } from '@/components/transaction-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { transactionKeys, transactionQuery } from '@/query/transaction.js';
import { InstallmentsList } from '../@components/installments-list.js';
import { TransactionForm } from '../@components/transaction-form.js';
import { type TransactionDetailsSearch, transactionDetailsSearchSchema } from '../@interface/transactions.interface.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// The entry page (SGD-02): what it is, the service it belongs to and the receipts. A receipt suggestion of the
// court (AD-269) stands beside the receipts and in the header; approving it opens the receipt dialog.
export function TransactionDetailsPage() {
  const search = useSearch({ strict: false }) as TransactionDetailsSearch;
  const { data: session } = useSuspenseQuery(sessionQuery);
  const queryClient = useQueryClient();
  const query = useQuery({ ...transactionQuery(search.id), retry: false });
  const transaction = query.data;
  const receipts = suggestionsFor(useCaseSuggestions(transaction?.caseId), 'transaction_installment');
  const [panel, setPanel] = useState<'edit' | 'receive' | null>(null);
  const canUpdate = can(session, 'finance', 'update');
  const state = transaction && transactionState(transaction, formatDisplayDate(new Date()));
  const refresh = () => queryClient.invalidateQueries({ queryKey: transactionKeys.all });

  return (
    <Card asPage>
      <CardHeader title={t('details')}>
        {transaction && (
          <CardAction>
            <SuggestionButton suggestions={receipts} count />
            {canUpdate && (
              <Button variant="outline" onClick={() => setPanel('edit')}>
                {t('edit')}
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {query.isLoading ? (
          <DefaultLoading />
        ) : !transaction || !state ? (
          <DefaultEmptyData title={t('not_found')} />
        ) : (
          <>
            <RecordHeader>
              <RecordHeading
                icon={<Wallet />}
                label={`${t(transaction.kind)} · ${categoryLabel(transaction)}`}
                title={transaction.description}
                description={
                  transaction.caseId ? (
                    <AppLink to="/expert-cases/details" search={{ id: transaction.caseId }} as="description">
                      {transaction.caseNumber ?? t('expert_case')}
                    </AppLink>
                  ) : undefined
                }
              />
              <RecordStatus variant={STATE_VARIANT[state]} label={stateLabel(state)} pulse={false} />
            </RecordHeader>
            <RecordStats>
              <RecordStat label={t('amount')} value={formatMoney(transaction.amountCents)} />
              <RecordStat label={t('due_date')} value={day(transaction.dueDate)} />
              {transaction.kind === 'income' && (
                <RecordStat label={t('received')} value={formatMoney(transaction.receivedCents ?? 0)} />
              )}
              {transaction.kind === 'income' && (
                <RecordStat
                  label={t('balance_due')}
                  value={formatMoney(transaction.balanceCents ?? 0)}
                  headerAction={<SuggestionButton suggestions={receipts} />}
                />
              )}
            </RecordStats>
            {transaction.kind === 'income' && (
              <InstallmentsList
                transaction={transaction}
                onChanged={refresh}
                onReceive={canUpdate ? () => setPanel('receive') : undefined}
              />
            )}
          </>
        )}
      </CardContent>
      {transaction && panel === 'edit' && (
        <TransactionForm
          transaction={transaction}
          onClose={() => setPanel(null)}
          onReceive={canUpdate ? () => setPanel('receive') : undefined}
        />
      )}
      {transaction && panel === 'receive' && <ReceiptForm transaction={transaction} onClose={() => setPanel(null)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/finance/details/')({
  component: TransactionDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): TransactionDetailsSearch =>
    transactionDetailsSearchSchema.parse(search),
});
