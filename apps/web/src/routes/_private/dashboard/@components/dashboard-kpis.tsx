import { Link } from '@tanstack/react-router';
import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { direction, percentChange, splitPeriod } from '@/lib/helpers/period.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { FinanceSummary, MonthlyFlow } from '@/query/transaction.js';
import type { CaseDashboard } from '../@query/dashboard.js';

const number = new Intl.NumberFormat('pt-BR');
const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
const TREND_LABEL = { up: 'trend_up', down: 'trend_down', stable: 'trend_stable' } as const;

type DashboardKpisProps = {
  months: number;
  cases: CaseDashboard;
  // Complete months, oldest to newest: the period and the previous one. Absent for whoever does not see Finance.
  flow?: MonthlyFlow[];
  summary?: FinanceSummary;
  // Fees received since the start (DSH-02).
  receivedSinceStart?: number;
};

// Strip right under the Dashboard header (AD-255, AD-291), the same place as the Home and Services strips: how the
// money is doing in the period (balance, received, expenses, receivable, only for whoever sees Finance) and the
// new services against the previous period (the open ones are on the Home and Services strips). Each number with its monthly trend line
// and the change against the previous period of the same size.
export function DashboardKpis({ months, cases, flow, summary, receivedSinceStart }: DashboardKpisProps) {
  // The month in progress is out of every comparison.
  const intake = splitPeriod(cases.byMonth.slice(0, -1), months);
  const newCases = sum(intake.current, (row) => row.count);
  const newBefore = sum(intake.previous, (row) => row.count);
  const money = flow && splitPeriod(flow, months);
  const received = money ? sum(money.current, (row) => row.receivedCents) : 0;
  const receivedBefore = money ? sum(money.previous, (row) => row.receivedCents) : 0;
  const expenses = money ? sum(money.current, (row) => row.expensesCents) : 0;
  const expensesBefore = money ? sum(money.previous, (row) => row.expensesCents) : 0;
  const balance = received - expenses;
  const balanceBefore = receivedBefore - expensesBefore;

  // One condition per cell, no fragment: the strip counts its direct children to pick the columns.
  return (
    <RecordStats variant="band" role="group" aria-label={t('overview')}>
      {money && (
        <RecordStat
          label={t('balance')}
          value={formatMoney(balance)}
          dot={{ variant: balance > 0 ? 'success' : balance < 0 ? 'error' : 'neutral' }}
          trend={direction(balance, balanceBefore)}
          trendLabel={t(TREND_LABEL[direction(balance, balanceBefore)])}
          hint={balance < 0 ? t('negative') : percentChange(balance, balanceBefore)}
          sparkline={money.current.map((row) => row.receivedCents - row.expensesCents)}
        />
      )}
      {money && (
        <RecordStat
          label={t('received')}
          value={formatMoney(received)}
          trend={direction(received, receivedBefore)}
          trendLabel={t(TREND_LABEL[direction(received, receivedBefore)])}
          hint={percentChange(received, receivedBefore)}
          sparkline={money.current.map((row) => row.receivedCents)}
          description={
            receivedSinceStart === undefined
              ? undefined
              : `${formatMoney(receivedSinceStart)} ${t('since_start').toLowerCase()}`
          }
        />
      )}
      {money && (
        <RecordStat
          label={t('expenses')}
          value={formatMoney(expenses)}
          trend={direction(expenses, expensesBefore)}
          trendLabel={t(TREND_LABEL[direction(expenses, expensesBefore)])}
          // More expense is bad: the arrow up is red.
          trendTone={expenses > expensesBefore ? 'bad' : expenses < expensesBefore ? 'good' : 'neutral'}
          hint={percentChange(expenses, expensesBefore)}
          sparkline={money.current.map((row) => row.expensesCents)}
        />
      )}
      {summary && (
        <RecordStat
          label={t('receivable')}
          value={formatMoney(summary.receivableCents)}
          dot={{ variant: summary.lateCents ? 'error' : 'success' }}
          description={
            summary.lateCents ? (
              <span className="text-destructive">{`${formatMoney(summary.lateCents)} ${t('overdue').toLowerCase()}`}</span>
            ) : (
              t('up_to_date')
            )
          }
          render={<Link to="/finance" search={{ state: summary.lateCents ? 'overdue' : 'expected' }} />}
        />
      )}
      <RecordStat
        label={t('new_expert_cases')}
        value={number.format(newCases)}
        trend={direction(newCases, newBefore)}
        trendLabel={t(TREND_LABEL[direction(newCases, newBefore)])}
        hint={percentChange(newCases, newBefore)}
        sparkline={intake.current.map((row) => row.count)}
      />
    </RecordStats>
  );
}
