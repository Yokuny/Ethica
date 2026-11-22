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

type DashboardKpisProps = {
  cases: CaseDashboard;
  months: number;
  // `2 × months` months: the period and the previous one. Absent for whoever does not see Finance.
  flow?: MonthlyFlow[];
  summary?: FinanceSummary;
};

// Level 1 of the Dashboard (AD-255): how the office is doing in the period. Each number with its monthly trend
// line, the change against the previous period of the same size and whether that is good or bad.
export function DashboardKpis({ cases, months, flow, summary }: DashboardKpisProps) {
  const intake = splitPeriod(cases.byMonth, months);
  const newCases = sum(intake.current, (row) => row.count);
  const newBefore = sum(intake.previous, (row) => row.count);
  const money = flow && splitPeriod(flow, months);
  const totals = money && {
    received: sum(money.current, (row) => row.receivedCents),
    receivedBefore: sum(money.previous, (row) => row.receivedCents),
    expenses: sum(money.current, (row) => row.expensesCents),
    expensesBefore: sum(money.previous, (row) => row.expensesCents),
  };
  const balance = totals && totals.received - totals.expenses;
  const balanceBefore = totals && totals.receivedBefore - totals.expensesBefore;

  return (
    <div className="flex flex-col gap-2">
      <RecordStats variant="band" role="group" aria-label={t('overview')}>
        {money && totals && balance !== undefined && balanceBefore !== undefined && (
          <>
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
              value={formatMoney(totals.received)}
              trend={direction(totals.received, totals.receivedBefore)}
              trendLabel={t(TREND_LABEL[direction(totals.received, totals.receivedBefore)])}
              hint={percentChange(totals.received, totals.receivedBefore)}
              sparkline={money.current.map((row) => row.receivedCents)}
            />
            <RecordStat
              label={t('expenses')}
              value={formatMoney(totals.expenses)}
              trend={direction(totals.expenses, totals.expensesBefore)}
              trendLabel={t(TREND_LABEL[direction(totals.expenses, totals.expensesBefore)])}
              // More expense is bad: the arrow up is red.
              trendTone={
                totals.expenses > totals.expensesBefore
                  ? 'bad'
                  : totals.expenses < totals.expensesBefore
                    ? 'good'
                    : 'neutral'
              }
              hint={percentChange(totals.expenses, totals.expensesBefore)}
              sparkline={money.current.map((row) => row.expensesCents)}
            />
          </>
        )}
        {summary && (
          <RecordStat
            label={t('receivable')}
            value={formatMoney(summary.receivableCents)}
            dot={{ variant: summary.lateCents ? 'error' : 'success' }}
            hint={
              summary.lateCents ? `${formatMoney(summary.lateCents)} ${t('overdue').toLowerCase()}` : t('up_to_date')
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
        <RecordStat
          label={t('open_expert_cases')}
          value={number.format(cases.total - cases.closed)}
          hint={`${t('of')} ${number.format(cases.total)}`}
          render={<Link to="/expert-cases" />}
        />
      </RecordStats>
      <ItemDescription className="text-xs">{t('kpis_scope_note')}</ItemDescription>
    </div>
  );
}
