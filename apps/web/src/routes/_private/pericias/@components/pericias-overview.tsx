import type { ListStats } from '@ethica/contracts';
import { ListTrendStat } from '@/components/list-trend-stat.js';
import { RecordStats } from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { statCount } from '@/query/listStats.js';

const number = new Intl.NumberFormat('pt-BR');
const GROUPS = ['abertas', 'prazo_vencido', 'prazo_proximo', 'laudos_entregues'] as const;
const LABELS: Record<(typeof GROUPS)[number], string> = {
  abertas: 'open_pericias',
  prazo_vencido: 'overdue_deadlines',
  prazo_proximo: 'deadlines_due_soon',
  laudos_entregues: 'reports_delivered',
};

// Faixa de indicadores da listagem, a partir de GET /pericias/stats.
export function PericiasOverview({ stats }: { stats?: ListStats }) {
  return (
    <RecordStats variant="band" role="group" aria-label={t('pericias')}>
      <ListTrendStat
        label={t('pericias')}
        value={stats ? number.format(stats.total) : '—'}
        trend={stats?.trend}
        event={t('registered_pericias')}
      />
      {GROUPS.map((key) => {
        const count = statCount(stats, key);
        return (
          <ListTrendStat
            key={key}
            label={t(LABELS[key])}
            value={count === undefined ? '—' : number.format(count)}
            // Prazos não são perícias: a proporção sobre o total só vale para as faixas de perícia.
            ratio={count !== undefined && stats?.total && !key.startsWith('prazo_') ? count / stats.total : undefined}
            event={t(LABELS[key])}
          />
        );
      })}
    </RecordStats>
  );
}
