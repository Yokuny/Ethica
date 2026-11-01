import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { FinanceFlowChart } from '@/components/finance-flow-chart.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { categoriesQuery, monthlyFlowQuery } from '@/query/transaction.js';
import { CategoriesChart } from './@components/categories-chart.js';
import { PERIOD_LABEL, PERIODS, type ReportsSearch, reportsSearchSchema } from './@interface/reports.interface.js';

export function ReportsPage() {
  const search = useSearch({ strict: false }) as ReportsSearch;
  const navigate = useNavigate({ from: '/finance/reports/' });
  const flow = useQuery(monthlyFlowQuery(Number(search.months)));
  const income = useQuery(categoriesQuery('income'));
  const expenses = useQuery(categoriesQuery('expense'));

  return (
    <Card asPage>
      <CardHeader title={t('reports')} description={t('cash_flow_and_categories')}>
        <CardAction>
          <ToggleGroup
            aria-label={t('period')}
            value={search.months}
            onValueChange={(months) =>
              navigate({ search: { months: months as ReportsSearch['months'] }, replace: true })
            }
          >
            {PERIODS.map((months) => (
              <ToggleGroupItem key={months} value={months}>
                {t(PERIOD_LABEL[months])}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-10 pb-16">
        <Panel size="sm" title={t('cash_flow')}>
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
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/finance/reports/')({
  component: ReportsPage,
  staticData: { title: t('reports') },
  validateSearch: (search: Record<string, unknown>): ReportsSearch => reportsSearchSchema.parse(search),
});
