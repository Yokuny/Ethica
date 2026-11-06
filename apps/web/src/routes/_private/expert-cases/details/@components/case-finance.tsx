import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { AppLink } from '@/components/app-link.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { categoryLabel, STATE_VARIANT, stateLabel, transactionState } from '@/components/transaction-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseRecord } from '@/query/case.js';
import { transactionsQuery } from '@/query/transaction.js';
import { caseFinance } from '../@utils/case-finance.js';
import { ExpenseForm } from './expense-form.js';

const ENTRIES_LIMIT = 100;

// Service money (SRV-04, SRV-05): payment from the receipts, expenses and the net fee, plus every
// entry of the service. Only for whoever sees finance (AD-137); posting needs `finance` create.
export function CaseFinance({ legalCase, canCreate }: { legalCase: CaseRecord; canCreate: boolean }) {
  const transactions = useQuery(transactionsQuery({ caseId: legalCase.id, limit: ENTRIES_LIMIT }));
  const [adding, setAdding] = useState(false);
  const today = formatDisplayDate(new Date());
  const items = transactions.data?.items ?? [];
  const finance = caseFinance(legalCase, items);

  return (
    <Panel
      collapsible
      icon={<Wallet />}
      size="sm"
      title={t('service_finance')}
      description={t('service_finance_description')}
      actions={
        <>
          <AppLink to="/finance/entries" search={{ caseId: legalCase.id }}>
            {t('financial_entries')}
          </AppLink>
          {canCreate && (
            <Button variant="outline" onClick={() => setAdding(true)}>
              {t('add_expense')}
            </Button>
          )}
        </>
      }
    >
      {transactions.isLoading ? (
        <DefaultLoading />
      ) : (
        <div className="grid gap-6">
          <RecordStats>
            <RecordStat label={t('base_fees')} value={formatMoney(finance.baseCents)} />
            <RecordStat
              label={t('payment')}
              value={t(finance.payment)}
              hint={`${t('received')}: ${formatMoney(finance.receivedCents)}`}
            />
            <RecordStat label={t('expenses')} value={formatMoney(finance.expensesCents)} />
            <RecordStat label={t('net_fees')} value={formatMoney(finance.netCents)} />
          </RecordStats>
          {!items.length ? (
            <DefaultEmptyData title={t('no_entries_yet')} />
          ) : (
            <LinkList>
              {items.map((item) => {
                const state = transactionState(item, today);
                return (
                  <LinkListItem
                    key={item.id}
                    icon={Wallet}
                    render={<Link to="/finance/entries" search={{ caseId: legalCase.id }} />}
                    title={
                      item.status === 'canceled'
                        ? formatMoney(0)
                        : `${item.kind === 'expense' ? '−' : ''}${formatMoney(item.amountCents)}`
                    }
                    badges={<Badge variant={STATE_VARIANT[state]}>{stateLabel(state)}</Badge>}
                    description={`${categoryLabel(item)} · ${formatDate(new Date(`${item.dueDate}T12:00:00`))}`}
                  />
                );
              })}
            </LinkList>
          )}
        </div>
      )}
      {adding && <ExpenseForm caseId={legalCase.id} onClose={() => setAdding(false)} />}
    </Panel>
  );
}
