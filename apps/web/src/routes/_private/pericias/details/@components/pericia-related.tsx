import { Badge } from '@ethica/ui/components/badge';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { SITUACAO_VARIANT, situacaoDoLancamento } from '@/components/lancamento-labels.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { UpcomingCompromissos } from '@/components/upcoming-compromissos.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { upcomingCompromissosQuery } from '@/query/compromisso.js';
import { lancamentosQuery } from '@/query/lancamento.js';

// Vínculos da perícia: próximos compromissos e (para quem vê o financeiro) lançamentos.
export function PericiaRelated({ periciaId, canSeeFinance }: { periciaId: string; canSeeFinance: boolean }) {
  const compromissos = useQuery(upcomingCompromissosQuery({ limit: 10, periciaId }));
  const lancamentos = useQuery({ ...lancamentosQuery({ periciaId, limit: 50 }), enabled: canSeeFinance });
  const today = formatDisplayDate(new Date());

  return (
    <div className="grid gap-10">
      <Panel size="sm" title={t('upcoming_commitments')} actions={<AppLink to="/agenda">{t('open_agenda')}</AppLink>}>
        {compromissos.isLoading ? (
          <DefaultLoading />
        ) : !compromissos.data?.length ? (
          <DefaultEmptyData title={t('nothing_scheduled')} />
        ) : (
          <UpcomingCompromissos items={compromissos.data} />
        )}
      </Panel>
      {canSeeFinance && (
        <Panel size="sm" title={t('financial_entries')}>
          {lancamentos.isLoading ? (
            <DefaultLoading />
          ) : !lancamentos.data?.items.length ? (
            <DefaultEmptyData title={t('no_entries_yet')} />
          ) : (
            <LinkList>
              {lancamentos.data.items.map((item) => {
                const situacao = situacaoDoLancamento(item, today);
                return (
                  <LinkListItem
                    key={item.id}
                    icon={Wallet}
                    render={<Link to="/financeiro/lancamentos" search={{ periciaId }} />}
                    title={`${item.natureza === 'expense' ? '−' : ''}${formatMoney(item.valorCents)}`}
                    badges={<Badge variant={SITUACAO_VARIANT[situacao]}>{t(situacao)}</Badge>}
                    description={`${item.descricao} · ${formatDate(new Date(`${item.vencimento}T12:00:00`))}`}
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
