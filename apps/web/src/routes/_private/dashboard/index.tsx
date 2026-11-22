import { Button } from '@ethica/ui/components/button';
import { ItemTitle } from '@ethica/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { BarList } from '@/components/bar-list.js';
import { serviceTypeLabel } from '@/components/case-labels.js';
import { CashFlowTable } from '@/components/cash-flow-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { categoriesQuery, financeSummaryQuery, monthlyFlowQuery } from '@/query/transaction.js';
import { CasesMonthTable } from './@components/cases-month-table.js';
import { CategoryBars } from './@components/category-bars.js';
import { FinanceOverview } from './@components/finance-overview.js';
import {
  type DashboardSearch,
  dashboardSearchSchema,
  PERIOD_LABEL,
  PERIOD_SCOPE,
  PERIODS,
} from './@interface/dashboard.interface.js';
import { type CaseDashboard, caseDashboardQuery, feesDashboardQuery } from './@query/dashboard.js';

const number = new Intl.NumberFormat('pt-BR');
const formatNumber = (value: number) => number.format(value);
const typeKey = (row: { role: string; serviceType?: string }) => row.serviceType ?? row.role;

// Each type with its count, the share of all services and how many came in the last 12 months; the row opens
// the list filtered by that type (AD-253).
const typeItems = ({ total, byType, byMonth }: CaseDashboard) => {
  const recent = new Map<string, number>();
  for (const month of byMonth)
    for (const row of month.byType) recent.set(typeKey(row), (recent.get(typeKey(row)) ?? 0) + row.count);
  return byType.map((row) => ({
    key: typeKey(row),
    label: serviceTypeLabel(row),
    amount: row.count,
    value: formatNumber(row.count),
    detail: `${Math.round((row.count / (total || 1)) * 100)}% · ${formatNumber(recent.get(typeKey(row)) ?? 0)} ${t('in_12_months')}`,
    render: row.serviceType ? (
      <Link to="/expert-cases" search={{ serviceType: [row.serviceType] }} />
    ) : row.role === 'court_expert' || row.role === 'technical_assistant' ? (
      <Link to="/expert-cases" search={{ role: [row.role] }} />
    ) : undefined,
  }));
};

// Totals of the office (DSH): the amounts, the cash flow and the categories only for whoever sees finance (AD-137).
export function DashboardPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const canSeeFinance = can(session, 'finance');
  const cases = useQuery(caseDashboardQuery);
  const fees = useQuery({ ...feesDashboardQuery, enabled: canSeeFinance });
  const search = useSearch({ strict: false }) as DashboardSearch;
  const navigate = useNavigate({ from: '/dashboard/' });
  const summary = useQuery({ ...financeSummaryQuery, enabled: canSeeFinance });
  // One month more than the period: the base of the first month's change.
  const flow = useQuery({ ...monthlyFlowQuery(Number(search.months) + 1), enabled: canSeeFinance });
  const income = useQuery({ ...categoriesQuery('income', Number(search.months)), enabled: canSeeFinance });
  const expenses = useQuery({ ...categoriesQuery('expense', Number(search.months)), enabled: canSeeFinance });
  // One period for the cash flow and the categories, offered in both panels.
  const periodToggle = (
    <ToggleGroup
      aria-label={t('period')}
      value={search.months}
      onValueChange={(months) => navigate({ search: { months: months as DashboardSearch['months'] }, replace: true })}
    >
      {PERIODS.map((months) => (
        <ToggleGroupItem key={months} value={months}>
          {t(PERIOD_LABEL[months])}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  return (
    <Card asPage>
      <CardHeader title={t('dashboard')} description={t('dashboard_page_description')} />
      {cases.data && (
        <RecordStats variant="band" role="group" aria-label={t('overview')}>
          <RecordStat label={t('expert_cases')} value={formatNumber(cases.data.total)} />
          <RecordStat label={t('closed_expert_cases')} value={formatNumber(cases.data.closed)} />
          {canSeeFinance && fees.data && (
            <RecordStat label={t('fees_received')} value={formatMoney(fees.data.receivedCents)} />
          )}
        </RecordStats>
      )}
      <CardContent className="gap-10 pb-16">
        {cases.isLoading ? (
          <DefaultLoading />
        ) : !cases.data ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void cases.refetch()}>{t('try_again')}</Button>}
          />
        ) : (
          <>
            <Panel
              size="lg"
              title={t('expert_cases_by_type')}
              description={t('services_by_type_scope')}
              actions={
                cases.data.byType.length > 0 && (
                  <ItemTitle className="font-medium tabular-nums">{formatNumber(cases.data.total)}</ItemTitle>
                )
              }
            >
              {cases.data.byType.length ? (
                <BarList tone="info" items={typeItems(cases.data)} />
              ) : (
                <DefaultEmptyData title={t('no_data_yet')} />
              )}
            </Panel>
            <Panel size="lg" title={t('expert_cases_by_month')} description={t('services_by_month_scope')}>
              {cases.data.byMonth.some((row) => row.count) ? (
                <CasesMonthTable byMonth={cases.data.byMonth} />
              ) : (
                <DefaultEmptyData title={t('no_data_yet')} />
              )}
            </Panel>
            {canSeeFinance && (
              <>
                <Panel size="lg" title={t('finance')}>
                  <FinanceOverview summary={summary.data} />
                </Panel>
                <Panel size="lg" title={t('cash_flow')} actions={periodToggle}>
                  {flow.isLoading ? (
                    <DefaultLoading />
                  ) : !flow.data?.some((row) => row.receivedCents || row.receivableCents || row.expensesCents) ? (
                    <DefaultEmptyData title={t('no_entries_yet')} />
                  ) : (
                    <CashFlowTable data={flow.data} />
                  )}
                </Panel>
                <Panel
                  size="lg"
                  title={t('income_and_expenses_by_category')}
                  description={t(PERIOD_SCOPE[search.months])}
                  actions={periodToggle}
                >
                  {income.isLoading || expenses.isLoading ? (
                    <DefaultLoading />
                  ) : !income.data?.length && !expenses.data?.length ? (
                    <DefaultEmptyData title={t('no_entries_yet')} />
                  ) : (
                    <CategoryBars income={income.data ?? []} expenses={expenses.data ?? []} />
                  )}
                </Panel>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/dashboard/')({
  component: DashboardPage,
  staticData: { title: t('dashboard') },
  validateSearch: (search: Record<string, unknown>): DashboardSearch => dashboardSearchSchema.parse(search),
});
