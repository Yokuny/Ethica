import type { ListStats } from '@ethica/contracts';
import { ListTrendStat } from '@/components/list-trend-stat.js';
import { RecordStats } from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { statCount } from '@/query/listStats.js';

const number = new Intl.NumberFormat('pt-BR');
const GROUPS = ['open', 'overdue_deadlines', 'deadlines_due_soon', 'reports_delivered'] as const;
const LABELS: Record<(typeof GROUPS)[number], string> = {
  open: 'open_expert_cases',
  overdue_deadlines: 'overdue_deadlines',
  deadlines_due_soon: 'deadlines_due_soon',
  reports_delivered: 'reports_delivered',
};

// Listing indicator strip, from GET /expert-cases/stats.
export function CasesOverview({ stats }: { stats?: ListStats }) {
  return (
    <RecordStats variant="band" role="group" aria-label={t('expert_cases')}>
      <ListTrendStat
        label={t('expert_cases')}
        value={stats ? number.format(stats.total) : '—'}
        trend={stats?.trend}
        event={t('registered_expert_cases')}
      />
      {GROUPS.map((key) => {
        const count = statCount(stats, key);
        return (
          <ListTrendStat
            key={key}
            label={t(LABELS[key])}
            value={count === undefined ? '—' : number.format(count)}
            // Deadlines are not cases: the ratio over the total only applies to the case strips.
            ratio={
              count !== undefined && stats?.total && !key.startsWith('deadline_') ? count / stats.total : undefined
            }
            event={t(LABELS[key])}
          />
        );
      })}
    </RecordStats>
  );
}
