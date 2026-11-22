import { ItemDescription } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { FinanceSummary, MonthlyFlow } from '@/query/transaction.js';
import type { CaseDashboard } from '../@query/dashboard.js';
import { direction, percentChange, splitPeriod } from '../@utils/dashboard-period.js';

const number = new Intl.NumberFormat('pt-BR');
const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
const TREND_LABEL = { up: 'trend_up', down: 'trend_down', stable: 'trend_stable' } as const;

type MoneyKpisProps = {
  months: number;
  // Complete months, oldest to newest: the period and the previous one.
  flow: MonthlyFlow[];
  summary?: FinanceSummary;
  // Fees received since the start (DSH-02).
  receivedSinceStart?: number;
};

// Level 1 of the Dashboard (AD-255): how the money is doing in the period — balance, received, expenses and what
// is still to receive. Each number with its monthly trend line, the change against the previous period of the same
// size and whether that is good or bad. Four at most, so the strip is read in one line.
export function MoneyKpis({ months, flow, summary, receivedSinceStart }: MoneyKpisProps) {
  const money = splitPeriod(flow, months);
  const received = sum(money.current, (row) => row.receivedCents);
  const receivedBefore = sum(money.previous, (row) => row.receivedCents);
  const expenses = sum(money.current, (row) => row.expensesCents);
  const expensesBefore = sum(money.previous, (row) => row.expensesCents);
  const balance = received - expenses;
  const balanceBefore = receivedBefore - expensesBefore;

  return (
    <div className="flex flex-col gap-2">
      <RecordStats variant="band" role="group" aria-label={t('finance')}>
        <RecordStat
          label={t('balance')}
          value={formatMoney(balance)}
          dot={{ variant: balance > 0 ? 'success' : balance < 0 ? 'error' : 'neutral' }}
          trend={direction(balance, balanceBefore)}
          trendLabel={t(TREND_LABEL[direction(balance, balanceBefore)])}
          hint={balance < 0 ? t('negative') : percentChange(balance, balanceBefore)}
          sparkline={money.current.map((row) => row.receivedCents - row.expensesCents)}
        />
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
        {summary && (
          <RecordStat
            label={t('receivable')}
            value={formatMoney(summary.receivableCents)}
            dot={{ variant: summary.lateCents ? 'error' : 'success' }}
            // The overdue part on its own line: beside the value it would wrap over it.
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
      </RecordStats>
      <ItemDescription className="text-xs">{t('kpis_scope_note')}</ItemDescription>
    </div>
  );
}

// Opening of the Work section: new services in the period (against the previous one) and the ones still open.
export function WorkKpis({ cases, months }: { cases: CaseDashboard; months: number }) {
  // The month in progress is out of every comparison.
  const intake = splitPeriod(cases.byMonth.slice(0, -1), months);
  const newCases = sum(intake.current, (row) => row.count);
  const newBefore = sum(intake.previous, (row) => row.count);
  return (
    <RecordStats variant="band" role="group" aria-label={t('work')}>
      <RecordStat
        label={t('new_expert_cases')}
        value={number.format(newCases)}
        trend={direction(newCases, newBefore)}
        trendLabel={t(TREND_LABEL[direction(newCases, newBefore)])}
        hint={percentChange(newCases, newBefore)}
        sparkline={intake.current.map((row) => row.count)}
      />
      <RecordStat
        label={t('open_expert_cases')}
        value={number.format(cases.total - cases.closed)}
        hint={`${t('of')} ${number.format(cases.total)}`}
        description={`${number.format(cases.closed)} ${t('closed_expert_cases').toLowerCase()}`}
        render={<Link to="/expert-cases" />}
      />
    </RecordStats>
  );
}
