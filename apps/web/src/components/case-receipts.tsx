import { Badge } from '@ethica/ui/components/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
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
        <ItemGroup>
          {query.data.items.map((fee) => {
            const state = transactionState(fee, today);
            return (
              <li key={fee.id}>
                <Item render={<Link to="/finance" search={{ caseId }} />}>
                  <ItemContent className="gap-3">
                    <div className="flex flex-col gap-0.5">
                      <ItemTitle className="text-base tabular-nums">{formatMoney(fee.amountCents)}</ItemTitle>
                      <ItemDescription>{fee.description}</ItemDescription>
                    </div>
                    <dl className="flex flex-wrap gap-x-8 gap-y-2">
                      {[
                        { label: t('received'), value: fee.receivedCents ?? 0 },
                        { label: t('balance_due'), value: fee.balanceCents ?? 0 },
                      ].map((row) => (
                        <div key={row.label} className="flex flex-col gap-0.5">
                          <ItemDescription render={<dt />} className="text-xs">
                            {row.label}
                          </ItemDescription>
                          <ItemTitle render={<dd />} className="tabular-nums">
                            {formatMoney(row.value)}
                          </ItemTitle>
                        </div>
                      ))}
                    </dl>
                    {fee.installments.length > 0 && (
                      <ul className="flex flex-col gap-1 border-t pt-2">
                        {fee.installments.map((installment) => (
                          <li key={installment.id} className="flex flex-wrap items-baseline gap-x-2">
                            <ItemTitle className="font-medium tabular-nums">
                              {formatMoney(installment.amountCents)}
                            </ItemTitle>
                            <ItemDescription>
                              {[day(installment.date), installment.account].filter(Boolean).join(' · ')}
                            </ItemDescription>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ItemContent>
                  <ItemActions>
                    <Badge variant={STATE_VARIANT[state]}>{stateLabel(state)}</Badge>
                  </ItemActions>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Item>
              </li>
            );
          })}
        </ItemGroup>
      )}
    </Panel>
  );
}
