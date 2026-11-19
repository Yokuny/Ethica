import { Button } from '@ethica/ui/components/button';
import { ItemTitle } from '@ethica/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { serviceTypeLabel } from '@/components/case-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { HeatTiles, HeatTilesLegend } from '@/components/heat-tiles.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { ShareList } from '@/components/share-list.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { type CategoryTotal, categoriesQuery, financeSummaryQuery, monthlyFlowQuery } from '@/query/transaction.js';
import { CashFlowTable } from './@components/cash-flow-table.js';
import { FinanceOverview } from './@components/finance-overview.js';
import { MonthColumnsChart } from './@components/month-columns-chart.js';
import {
  type DashboardSearch,
  dashboardSearchSchema,
  PERIOD_LABEL,
  PERIODS,
} from './@interface/dashboard.interface.js';
import { caseDashboardQuery, feesDashboardQuery } from './@query/dashboard.js';

const number = new Intl.NumberFormat('pt-BR');
const formatNumber = (value: number) => number.format(value);
const sumOf = (rows: CategoryTotal[] = []) => rows.reduce((total, row) => total + row.totalCents, 0);
const shares = (rows: CategoryTotal[]) =>
  rows.map((row) => ({
    key: row.category,
    label: t(row.category),
    amount: row.totalCents,
    value: formatMoney(row.totalCents),
  }));

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
  const income = useQuery({ ...categoriesQuery('income'), enabled: canSeeFinance });
  const expenses = useQuery({ ...categoriesQuery('expense'), enabled: canSeeFinance });

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
              actions={cases.data.byType.length > 0 && <HeatTilesLegend />}
            >
              {cases.data.byType.length ? (
                <HeatTiles
                  items={cases.data.byType.map((row) => ({
                    key: row.serviceType ?? row.role,
                    label: serviceTypeLabel(row),
                    count: row.count,
                  }))}
                />
              ) : (
                <DefaultEmptyData title={t('no_data_yet')} />
              )}
            </Panel>
            <Panel size="lg" title={t('expert_cases_by_month')}>
              {cases.data.byMonth.some((row) => row.count) ? (
                <MonthColumnsChart label={t('expert_cases')} data={cases.data.byMonth} />
              ) : (
                <DefaultEmptyData title={t('no_data_yet')} />
              )}
            </Panel>
            {canSeeFinance && (
              <>
                <Panel size="lg" title={t('finance')}>
                  <FinanceOverview summary={summary.data} />
                </Panel>
                <Panel
                  size="lg"
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
                  {flow.isLoading ? (
                    <DefaultLoading />
                  ) : !flow.data?.some((row) => row.receivedCents || row.receivableCents || row.expensesCents) ? (
                    <DefaultEmptyData title={t('no_entries_yet')} />
                  ) : (
                    <CashFlowTable data={flow.data} />
                  )}
                </Panel>
                <div className="grid gap-10 lg:grid-cols-2">
                  <Panel
                    size="lg"
                    title={t('income_by_category')}
                    description={t('entries_since_start')}
                    actions={
                      income.data?.length ? (
                        <ItemTitle className="font-medium tabular-nums">{formatMoney(sumOf(income.data))}</ItemTitle>
                      ) : undefined
                    }
                  >
                    {income.isLoading ? (
                      <DefaultLoading />
                    ) : !income.data?.length ? (
                      <DefaultEmptyData title={t('no_entries_yet')} />
                    ) : (
                      <ShareList tone="income" items={shares(income.data)} />
                    )}
                  </Panel>
                  <Panel
                    size="lg"
                    title={t('expenses_by_category')}
                    description={t('entries_since_start')}
                    actions={
                      expenses.data?.length ? (
                        <ItemTitle className="font-medium tabular-nums">{formatMoney(sumOf(expenses.data))}</ItemTitle>
                      ) : undefined
                    }
                  >
                    {expenses.isLoading ? (
                      <DefaultLoading />
                    ) : !expenses.data?.length ? (
                      <DefaultEmptyData title={t('no_entries_yet')} />
                    ) : (
                      <ShareList tone="expense" items={shares(expenses.data)} />
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
