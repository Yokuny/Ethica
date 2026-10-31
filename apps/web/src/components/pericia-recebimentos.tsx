import { Badge } from '@ethica/ui/components/badge';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { SITUACAO_VARIANT, situacaoDoLancamento } from '@/components/lancamento-labels.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { lancamentosQuery } from '@/query/lancamento.js';
import { canSeeFinance, sessionQuery } from '@/query/session.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Honorários da perícia com o que já entrou (parcelas) e o saldo, no detalhe de um evento
// da agenda. Só para quem vê o financeiro (AD-107): para os outros papéis não renderiza nada.
export function PericiaRecebimentos({ periciaId }: { periciaId: string }) {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const allowed = canSeeFinance(session);
  const query = useQuery({ ...lancamentosQuery({ periciaId, natureza: 'income', limit: 20 }), enabled: allowed });
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
          {query.data.items.map((honorario) => {
            const situacao = situacaoDoLancamento(honorario, today);
            return (
              <LinkListItem
                key={honorario.id}
                icon={Wallet}
                render={<Link to="/financeiro/lancamentos" search={{ periciaId }} />}
                title={formatMoney(honorario.valorCents)}
                badges={<Badge variant={SITUACAO_VARIANT[situacao]}>{t(situacao)}</Badge>}
                description={`${honorario.descricao} · ${t('received')} ${formatMoney(honorario.recebidoCents ?? 0)} · ${t('balance_due')} ${formatMoney(honorario.saldoCents ?? 0)}`}
              >
                {honorario.parcelas.map((parcela) => (
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
