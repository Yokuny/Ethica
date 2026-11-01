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
        label={t('open_expert_cases')}
        value={show(statCount(stats, 'open'))}
        trend={stats?.trend}
        event={t('registered_expert_cases')}
      />
      <RecordStat
        label={t('overdue_deadlines')}
        value={show(statCount(stats, 'overdue_deadlines'))}
        render={<Link to="/expert-cases" />}
      />
      <RecordStat label={t('deadlines_due_soon')} value={show(statCount(stats, 'deadlines_due_soon'))} />
      {resumo && (
        <RecordStat
          label={t('receivable')}
          value={formatMoney(resumo.aReceberCents)}
          hint={resumo.atrasadoCents ? `${formatMoney(resumo.atrasadoCents)} ${t('overdue')}` : undefined}
          render={<Link to="/finance/entries" search={{ situacao: 'expected' }} />}
        />
      )}
    </RecordStats>
  );
}
