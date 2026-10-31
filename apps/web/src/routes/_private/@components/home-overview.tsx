import type { ListStats } from '@ethica/contracts';
import { Link } from '@tanstack/react-router';
import { ListTrendStat } from '@/components/list-trend-stat.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { FinanceiroResumo } from '@/query/lancamento.js';
import { statCount } from '@/query/listStats.js';

const number = new Intl.NumberFormat('pt-BR');
const show = (value: number | undefined) => (value === undefined ? '—' : number.format(value));

// Faixa do início: o que pede atenção hoje. Valores financeiros só para quem os vê.
export function HomeOverview({ stats, resumo }: { stats?: ListStats; resumo?: FinanceiroResumo }) {
  return (
    <RecordStats variant="band" role="group" aria-label={t('overview')}>
      <ListTrendStat
        label={t('open_pericias')}
        value={show(statCount(stats, 'abertas'))}
        trend={stats?.trend}
        event={t('registered_pericias')}
      />
      <RecordStat
        label={t('overdue_deadlines')}
        value={show(statCount(stats, 'prazo_vencido'))}
        render={<Link to="/pericias" />}
      />
      <RecordStat label={t('deadlines_due_soon')} value={show(statCount(stats, 'prazo_proximo'))} />
      {resumo && (
        <RecordStat
          label={t('receivable')}
          value={formatMoney(resumo.aReceberCents)}
          hint={resumo.atrasadoCents ? `${formatMoney(resumo.atrasadoCents)} ${t('overdue')}` : undefined}
          render={<Link to="/financeiro/lancamentos" search={{ situacao: 'previsto' }} />}
        />
      )}
    </RecordStats>
  );
}
