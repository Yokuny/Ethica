import { Button } from '@ethica/ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { serviceTypeLabel } from '@/components/case-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { FinanceFlowChart } from '@/components/finance-flow-chart.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { categoriesQuery, financeSummaryQuery, monthlyFlowQuery } from '@/query/transaction.js';
import { CategoriesChart } from './@components/categories-chart.js';
import { FinanceOverview } from './@components/finance-overview.js';
import { YearColumnsChart } from './@components/year-columns-chart.js';
import {
  type DashboardSearch,
  dashboardSearchSchema,
  PERIOD_LABEL,
  PERIODS,
} from './@interface/dashboard.interface.js';
import { caseDashboardQuery, feesDashboardQuery } from './@query/dashboard.js';

const number = new Intl.NumberFormat('pt-BR');
const compactMoney = new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' });
const formatNumber = (value: number) => number.format(value);
const formatCompactMoney = (cents: number) => compactMoney.format(cents / 100);

// Totals of the office (DSH): the amounts, the cash flow and the categories only for whoever sees finance (AD-137).
export function DashboardPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const canSeeFinance = can(session, 'finance');
  const cases = useQuery(caseDashboardQuery);
  const fees = useQuery({ ...feesDashboardQuery, enabled: canSeeFinance });
  const search = useSearch({ strict: false }) as DashboardSearch;
  const navigate = useNavigate({ from: '/dashboard/' });
  const summary = useQuery({ ...financeSummaryQuery, enabled: canSeeFinance });
  const flow = useQuery({ ...monthlyFlowQuery(Number(search.months)), enabled: canSeeFinance });
  const income = useQuery({ ...categoriesQuery('income'), enabled: canSeeFinance });
  const expenses = useQuery({ ...categoriesQuery('expense'), enabled: canSeeFinance });
  const receivedByYear = fees.data?.receivedByYear ?? [];
  const receivedCents = receivedByYear.reduce((total, row) => total + row.cents, 0);

  return (
    <Card asPage>
      <CardHeader title={t('dashboard')} description={t('dashboard_page_description')} />
      {cases.data && (
        <RecordStats variant="band" role="group" aria-label={t('overview')}>
          <RecordStat label={t('expert_cases')} value={formatNumber(cases.data.total)} />
          <RecordStat label={t('closed_expert_cases')} value={formatNumber(cases.data.closed)} />
          {canSeeFinance && fees.data && <RecordStat label={t('fees_received')} value={formatMoney(receivedCents)} />}
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
            <Panel size="sm" title={t('expert_cases_by_type')}>
              {cases.data.byType.length ? (
                <RecordStats>
                  {cases.data.byType.map((row) => (
                    <RecordStat
                      key={row.serviceType ?? row.role}
                      label={serviceTypeLabel(row)}
                      value={formatNumber(row.count)}
                    />
                  ))}
                </RecordStats>
              ) : (
                <DefaultEmptyData title={t('no_data_yet')} />
              )}
            </Panel>
            <div className="grid gap-10 lg:grid-cols-2">
              <Panel size="sm" title={t('court_cases_by_year')}>
                {cases.data.courtExpertByYear.length ? (
                  <YearColumnsChart
                    label={t('expert_cases')}
                    data={cases.data.courtExpertByYear.map(({ year, count }) => ({ year, value: count }))}
                    format={formatNumber}
                    columnLabel={formatNumber}
                  />
                ) : (
                  <DefaultEmptyData title={t('no_data_yet')} />
                )}
              </Panel>
              {canSeeFinance && (
                <Panel size="sm" title={t('fees_received_by_year')}>
                  {fees.isLoading ? (
                    <DefaultLoading />
                  ) : receivedByYear.length ? (
                    <YearColumnsChart
                      label={t('fees_received')}
                      data={receivedByYear.map(({ year, cents }) => ({ year, value: cents }))}
                      format={formatMoney}
                      columnLabel={formatCompactMoney}
                    />
                  ) : (
                    <DefaultEmptyData title={t(fees.isError ? 'load_error' : 'no_data_yet')} />
                  )}
                </Panel>
              )}
            </div>
            {canSeeFinance && (
              <>
                <Panel size="sm" title={t('finance')}>
                  <FinanceOverview summary={summary.data} />
                </Panel>
                <Panel
                  size="sm"
                  title={t('cash_flow')}
                  actions={
                    <ToggleGroup
                      aria-label={t('period')}
                      value={search.months}
                      onValueChange={(months) =>
                        navigate({ search: { months: months as DashboardSearch['months'] }, replace: true })
                      }
                    >
                      {PERIODS.map((months) => (
                        <ToggleGroupItem key={months} value={months}>
                          {t(PERIOD_LABEL[months])}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  }
                >
                  {flow.isLoading ? <DefaultLoading /> : flow.data && <FinanceFlowChart data={flow.data} />}
                </Panel>
                <div className="grid gap-10 lg:grid-cols-2">
                  <Panel size="sm" title={t('income_by_category')}>
                    {income.isLoading ? (
                      <DefaultLoading />
                    ) : !income.data?.length ? (
                      <DefaultEmptyData title={t('no_entries_yet')} />
                    ) : (
                      <CategoriesChart kind="income" data={income.data} />
                    )}
                  </Panel>
                  <Panel size="sm" title={t('expenses_by_category')}>
                    {expenses.isLoading ? (
                      <DefaultLoading />
                    ) : !expenses.data?.length ? (
                      <DefaultEmptyData title={t('no_entries_yet')} />
                    ) : (
                      <CategoriesChart kind="expense" data={expenses.data} />
                    )}
                  </Panel>
                </div>
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
