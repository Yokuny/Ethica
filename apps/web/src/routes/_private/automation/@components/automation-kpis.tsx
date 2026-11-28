import type { AutomationDashboard } from '@ethica/contracts';
import { Link } from '@tanstack/react-router';
import { RecordStat, RecordStats } from '@/components/record.js';
import { direction, percentChange, splitPeriod } from '@/lib/helpers/period.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

const number = new Intl.NumberFormat('pt-BR');
const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
const TREND_LABEL = { up: 'trend_up', down: 'trend_down', stable: 'trend_stable' } as const;

type AutomationKpisProps = {
  dashboard: AutomationDashboard;
  // Complete months, oldest to newest: the period and the previous one.
  complete: AutomationDashboard['byMonth'];
  months: number;
};

// Strip of the Automação panel (PAT-01), right under the header as in the Dashboard (AD-255): what is tracked and
// what waits for approval now, and what the automation did in the period against the previous one of the same size.
// Short labels, as in the Dashboard: label and trend on one line, so the values and the lines of every cell align.
export function AutomationKpis({ dashboard, complete, months }: AutomationKpisProps) {
  const { current, previous } = splitPeriod(complete, months);
  const figure = (value: (row: AutomationDashboard['byMonth'][number]) => number) => {
    const now = sum(current, value);
    const before = sum(previous, value);
    const trend = direction(now, before);
    return {
      value: number.format(now),
      trend,
      trendLabel: t(TREND_LABEL[trend]),
      hint: percentChange(now, before),
      sparkline: current.map(value),
    };
  };
  const attention = dashboard.tracked.byState.not_found + dashboard.tracked.byState.stale;
  const accepted = sum(current, (row) => row.byStatus.accepted ?? 0);

  return (
    <RecordStats variant="band" role="group" aria-label={t('overview')}>
      <RecordStat
        label={t('processes')}
        value={number.format(dashboard.tracked.total)}
        dot={{ variant: attention ? 'warning' : 'success' }}
        description={
          attention
            ? `${number.format(attention)} ${t(attention === 1 ? 'needs_attention' : 'need_attention')}`
            : undefined
        }
      />
      <RecordStat label={t('movements')} {...figure((row) => row.movements)} />
      <RecordStat label={t('notices')} {...figure((row) => row.notices)} />
      <RecordStat
        label={t('suggestions')}
        {...figure((row) => row.suggestions)}
        description={`${number.format(accepted)} ${t('approved_plural')}`}
      />
      <RecordStat
        label={t('suggestions_to_approve')}
        value={number.format(dashboard.pending)}
        dot={{ variant: dashboard.pending ? 'warning' : 'success' }}
        render={<Link to="/notifications" search={{ kind: ['suggestion'] }} />}
      />
    </RecordStats>
  );
}
