import { Badge } from '@ethica/ui/components/badge';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { STATE_VARIANT, transactionState } from '@/components/lancamento-labels.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { lancamentosQuery } from '@/query/lancamento.js';
import { can, sessionQuery } from '@/query/session.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Honorários da perícia com o que já entrou (parcelas) e o saldo, no detalhe de um evento
// da agenda. Só para quem vê o financeiro (AD-107): para os outros papéis não renderiza nada.
export function CaseReceipts({ caseId }: { caseId: string }) {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const allowed = can(session, 'finance');
  const query = useQuery({ ...lancamentosQuery({ caseId, natureza: 'income', limit: 20 }), enabled: allowed });
  const today = formatDisplayDate(new Date());

  if (!allowed) return null;

  return (
    <Panel size="sm" title={t('receipts')}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.items.length ? (
        <DefaultEmptyData title={t('no_fees_yet')} />
      ) : (
        <LinkList>
          {query.data.items.map((fee) => {
            const state = transactionState(fee, today);
            return (
              <LinkListItem
                key={fee.id}
                icon={Wallet}
                render={<Link to="/finance/entries" search={{ caseId }} />}
                title={formatMoney(fee.valorCents)}
                badges={<Badge variant={STATE_VARIANT[state]}>{t(state)}</Badge>}
                description={`${fee.descricao} · ${t('received')} ${formatMoney(fee.recebidoCents ?? 0)} · ${t('balance_due')} ${formatMoney(fee.saldoCents ?? 0)}`}
              >
                {fee.parcelas.map((parcela) => (
                  <ItemDescription key={parcela.id} className="line-clamp-none">
                    {[day(parcela.data), formatMoney(parcela.valorCents), parcela.conta].filter(Boolean).join(' · ')}
                  </ItemDescription>
                ))}
              </LinkListItem>
            );
          })}
        </LinkList>
      )}
    </Panel>
  );
}
