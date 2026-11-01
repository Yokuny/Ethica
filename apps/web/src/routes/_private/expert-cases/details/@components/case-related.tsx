import { Badge } from '@ethica/ui/components/badge';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { STATE_VARIANT, transactionState } from '@/components/transaction-labels.js';
import { UpcomingAppointments } from '@/components/upcoming-appointments.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { upcomingAppointmentsQuery } from '@/query/appointment.js';
import { transactionsQuery } from '@/query/transaction.js';

// Vínculos da perícia: próximos compromissos e (para quem vê o financeiro) lançamentos.
export function CaseRelated({ caseId, canSeeFinance }: { caseId: string; canSeeFinance: boolean }) {
  const appointments = useQuery(upcomingAppointmentsQuery({ limit: 10, caseId }));
  const transactions = useQuery({ ...transactionsQuery({ caseId, limit: 50 }), enabled: canSeeFinance });
  const today = formatDisplayDate(new Date());

  return (
    <div className="grid gap-10">
      <Panel size="sm" title={t('upcoming_commitments')} actions={<AppLink to="/agenda">{t('open_agenda')}</AppLink>}>
        {appointments.isLoading ? (
          <DefaultLoading />
        ) : !appointments.data?.length ? (
          <DefaultEmptyData title={t('nothing_scheduled')} />
        ) : (
          <UpcomingAppointments items={appointments.data} />
        )}
      </Panel>
      {canSeeFinance && (
        <Panel size="sm" title={t('financial_entries')}>
          {transactions.isLoading ? (
            <DefaultLoading />
          ) : !transactions.data?.items.length ? (
            <DefaultEmptyData title={t('no_entries_yet')} />
          ) : (
            <LinkList>
              {transactions.data.items.map((item) => {
                const state = transactionState(item, today);
                return (
                  <LinkListItem
                    key={item.id}
                    icon={Wallet}
                    render={<Link to="/finance/entries" search={{ caseId }} />}
                    title={`${item.kind === 'expense' ? '−' : ''}${formatMoney(item.amountCents)}`}
                    badges={<Badge variant={STATE_VARIANT[state]}>{t(state)}</Badge>}
                    description={`${item.descricao} · ${formatDate(new Date(`${item.dueDate}T12:00:00`))}`}
                  />
                );
              })}
            </LinkList>
          )}
        </Panel>
      )}
    </div>
  );
}
