import { Button } from '@ethica/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { serviceTypeLabel } from '@/components/case-labels.js';
import { CashFlowChart } from '@/components/cash-flow-chart.js';
import { CashFlowTable } from '@/components/cash-flow-table.js';
import { CompositionDonut } from '@/components/composition-donut.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import {
  type CategoryTotal,
  categoriesQuery,
  financeSummaryQuery,
  monthlyFlowQuery,
  revenueGoalQuery,
} from '@/query/transaction.js';
import { CasesMonthTable } from './@components/cases-month-table.js';
import { DashboardAlerts } from './@components/dashboard-alerts.js';
import { DashboardKpis } from './@components/dashboard-kpis.js';
import { MonthDetails } from './@components/month-details.js';
import { RevenueGoalChart } from './@components/revenue-goal-chart.js';
import { ServicesAreaChart } from './@components/services-area-chart.js';
import {
  type DashboardSearch,
  dashboardSearchSchema,
  PERIOD_LABEL,
  PERIOD_SCOPE,
  PERIODS,
} from './@interface/dashboard.interface.js';
import { type CaseDashboard, caseDashboardQuery, feesDashboardQuery } from './@query/dashboard.js';
import { percentChange, rankTypes, typeKey } from './@utils/dashboard-period.js';

const number = new Intl.NumberFormat('pt-BR');
const formatNumber = (value: number) => number.format(value);
const sumOf = (rows: CategoryTotal[], key: 'totalCents' | 'previousCents') =>
  rows.reduce((total, row) => total + row[key], 0);

// Change of a part against the previous period (the panel description says so once); "new" without a base.
const changeText = (current: number, previous: number) =>
  previous ? percentChange(current, previous) : current ? t('new_in_period') : undefined;

// What each income category means, in the legend's tooltip.
const CATEGORY_HINTS: Partial<Record<CategoryTotal['category'], string>> = {
  fixed_fees: 'fixed_fees_hint',
  contracted_fees: 'contracted_fees_hint',
  advance_fees: 'advance_fees_hint',
};

const categorySlices = (rows: CategoryTotal[]) =>
  rows.map((row) => {
    const hint = CATEGORY_HINTS[row.category];
    return {
      key: row.category,
      label: t(row.category),
      amount: row.totalCents,
      value: formatMoney(row.totalCents),
      detail: changeText(row.totalCents, row.previousCents),
      hint: hint && t(hint),
    };
  });

// Each type opens the list of services filtered by it.
const typeSlices = (byType: CaseDashboard['byType']) =>
  rankTypes(byType).map((row) => ({
    key: typeKey(row),
    label: serviceTypeLabel(row),
    amount: row.count,
    value: formatNumber(row.count),
    render: row.serviceType ? (
      <Link to="/expert-cases" search={{ serviceType: [row.serviceType] }} />
    ) : row.role === 'court_expert' || row.role === 'technical_assistant' ? (
      <Link to="/expert-cases" search={{ role: [row.role] }} />
    ) : undefined,
  }));

// Dashboard (DSH, AD-255), macro → micro: (1) how the office is doing — figures with trend, change and state, and
// the alerts that need action; (2) money — cash flow over time and where it comes from and goes to; (2) work —
// service intake over time and the mix of services; the exact month by month one click below. One period for the
// whole page. Money only for whoever sees Finance (AD-137).
export function DashboardPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const canSeeFinance = can(session, 'finance');
  const search = useSearch({ strict: false }) as DashboardSearch;
  const navigate = useNavigate({ from: '/dashboard/' });
  const months = search.months;
  const cases = useQuery(caseDashboardQuery);
  const summary = useQuery({ ...financeSummaryQuery, enabled: canSeeFinance });
  const fees = useQuery({ ...feesDashboardQuery, enabled: canSeeFinance });
  const goal = useQuery({ ...revenueGoalQuery(search.year), enabled: canSeeFinance });
  const goalCents = goal.data?.goalCents;
  // Complete months only (the one in progress would end every line in a false drop): the period and the previous
  // one of the same size, plus the current month that the API also sends and the page drops.
  const flow = useQuery({ ...monthlyFlowQuery(2 * months + 1), enabled: canSeeFinance });
  const income = useQuery({ ...categoriesQuery('income', months), enabled: canSeeFinance });
  const expenses = useQuery({ ...categoriesQuery('expense', months), enabled: canSeeFinance });

  const complete = flow.data?.slice(0, -1);
  const period = complete?.slice(-months);
  const hasMoney = period?.some((row) => row.receivedCents || row.receivableCents || row.expensesCents);
  const balance = period?.reduce((total, row) => total + row.receivedCents - row.expensesCents, 0);
  const intake = cases.data?.byMonth.slice(0, -1).slice(-months);

  return (
    <Card asPage>
      <CardHeader title={t('dashboard')} description={t(PERIOD_SCOPE[search.months])}>
        <CardAction>
          <ToggleGroup
            aria-label={t('period')}
            value={String(months)}
            onValueChange={(value) =>
              navigate({
                search: { months: Number(value) as DashboardSearch['months'], year: search.year },
                replace: true,
              })
            }
          >
            {PERIODS.map((value) => (
              <ToggleGroupItem key={value} value={String(value)}>
                {t(PERIOD_LABEL[value])}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      {cases.data && (
        <DashboardKpis
          months={months}
          cases={cases.data}
          flow={canSeeFinance ? complete : undefined}
          summary={canSeeFinance ? summary.data : undefined}
          receivedSinceStart={canSeeFinance ? fees.data?.receivedCents : undefined}
        />
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
            {canSeeFinance && complete && (
              <DashboardAlerts lateCents={summary.data?.lateCents} balanceCents={balance} />
            )}

            {canSeeFinance && (
              <>
                <Panel size="lg" title={t('cash_flow')} description={t('cash_flow_scope')}>
                  {flow.isLoading ? (
                    <DefaultLoading />
                  ) : !period || !hasMoney ? (
                    <DefaultEmptyData title={t('no_entries_yet')} />
                  ) : (
                    <>
                      <CashFlowChart data={period} />
                      <MonthDetails>
                        <CashFlowTable data={complete?.slice(-(months + 1)) ?? []} />
                      </MonthDetails>
                    </>
                  )}
                </Panel>
                {goal.data && goalCents && (
                  <Panel
                    size="lg"
                    title={`${t('goal_of')} ${goal.data.year}`}
                    description={t('revenue_goal_scope')}
                    actions={
                      goal.data.years.length > 1 && (
                        <Select
                          items={goal.data.years.map((year) => ({ value: String(year), label: String(year) }))}
                          value={String(goal.data.year)}
                          onValueChange={(value) =>
                            value && navigate({ search: { months, year: Number(value) }, replace: true })
                          }
                        >
                          <SelectTrigger size="compact" aria-label={t('year')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {goal.data.years.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    }
                  >
                    <RevenueGoalChart goal={{ ...goal.data, goalCents }} />
                  </Panel>
                )}
                <div className="grid gap-10 lg:grid-cols-2">
                  <Panel size="lg" title={t('where_money_comes_from')} description={t('received_by_category')}>
                    {income.isLoading ? (
                      <DefaultLoading />
                    ) : !income.data?.some((row) => row.totalCents) ? (
                      <DefaultEmptyData title={t('no_entries_yet')} />
                    ) : (
                      <CompositionDonut
                        label={t('where_money_comes_from')}
                        slices={categorySlices(income.data)}
                        format={formatMoney}
                        centerDetail={changeText(sumOf(income.data, 'totalCents'), sumOf(income.data, 'previousCents'))}
                      />
                    )}
                  </Panel>
                  <Panel size="lg" title={t('where_money_goes')} description={t('expenses_by_category')}>
                    {expenses.isLoading ? (
                      <DefaultLoading />
                    ) : !expenses.data?.some((row) => row.totalCents) ? (
                      <DefaultEmptyData title={t('no_entries_yet')} />
                    ) : (
                      <CompositionDonut
                        label={t('where_money_goes')}
                        slices={categorySlices(expenses.data)}
                        format={formatMoney}
                        centerDetail={changeText(
                          sumOf(expenses.data, 'totalCents'),
                          sumOf(expenses.data, 'previousCents'),
                        )}
                      />
                    )}
                  </Panel>
                </div>
              </>
            )}

            <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
              <Panel size="lg" title={t('services_intake')} description={t('services_intake_scope')}>
                {!intake?.some((row) => row.count) ? (
                  <DefaultEmptyData title={t('no_data_yet')} />
                ) : (
                  <>
                    <ServicesAreaChart byType={cases.data.byType} byMonth={intake} />
                    <MonthDetails>
                      <CasesMonthTable byMonth={intake} />
                    </MonthDetails>
                  </>
                )}
              </Panel>
              <Panel size="lg" title={t('services_mix')} description={t('services_mix_scope')}>
                {cases.data.byType.length ? (
                  <CompositionDonut
                    label={t('services_mix')}
                    slices={typeSlices(cases.data.byType)}
                    format={formatNumber}
                  />
                ) : (
                  <DefaultEmptyData title={t('no_data_yet')} />
                )}
              </Panel>
            </div>
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
