import { Badge } from '@ethica/ui/components/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Panel } from '@/components/panel.js';
import { STATE_VARIANT, stateLabel, transactionState } from '@/components/transaction-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { transactionsQuery } from '@/query/transaction.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Case fees with what already came in (installments) and the balance, in the detail of an
// agenda event. Only for whoever sees finance (AD-107): for the other roles it renders nothing.
export function CaseReceipts({ caseId }: { caseId: string }) {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const allowed = can(session, 'finance');
  const query = useQuery({ ...transactionsQuery({ caseId, kind: 'income', limit: 20 }), enabled: allowed });
  const today = formatDisplayDate(new Date());

  if (!allowed) return null;

  return (
    <Panel size="sm" title={t('receipts')}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.items.length ? (
        <DefaultEmptyData title={t('no_fees_yet')} />
      ) : (
        <ItemGroup variant="list">
          {query.data.items.map((fee) => {
            const state = transactionState(fee, today);
            return (
              <li key={fee.id}>
                <Item render={<Link to="/finance" search={{ caseId }} />}>
                  <ItemContent>
                    <ItemTitle className="tabular-nums">{formatMoney(fee.amountCents)}</ItemTitle>
                    <ItemDescription>
                      {`${fee.description} · ${t('received')} ${formatMoney(fee.receivedCents ?? 0)} · ${t('balance_due')} ${formatMoney(fee.balanceCents ?? 0)}`}
                    </ItemDescription>
                    {fee.installments.map((installment) => (
                      <ItemDescription key={installment.id} className="line-clamp-none">
                        {[day(installment.date), formatMoney(installment.amountCents), installment.account]
                          .filter(Boolean)
                          .join(' · ')}
                      </ItemDescription>
                    ))}
                  </ItemContent>
                  <ItemActions>
                    <Badge variant={STATE_VARIANT[state]}>{stateLabel(state)}</Badge>
                  </ItemActions>
                </Item>
              </li>
            );
          })}
        </ItemGroup>
      )}
    </Panel>
  );
}
