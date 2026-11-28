import {
  type AutomationDashboard,
  type SuggestionOutcome,
  TRACKED_CASE_STATUSES,
  type TrackedCaseStatus,
} from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@ethica/ui/components/dropdown-menu';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { AutomationOffer } from '@/components/automation-offer.js';
import { CompositionDonut, NEUTRAL_COLOR } from '@/components/composition-donut.js';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { MonthDetails } from '@/components/month-details.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { TRACKED_CASE_VARIANT, trackedCaseLabel } from '@/components/tracked-case-labels.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { PERIOD_LABEL, PERIOD_SCOPE, PERIODS } from '@/lib/helpers/period.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { automationDashboardQuery, trackedCasesQuery } from '@/query/automation.js';
import { hasAutomationSession, sessionQuery } from '@/query/session.js';
import { ActivityMonthTable } from './@components/activity-month-table.js';
import { AutomationActivityChart } from './@components/automation-activity-chart.js';
import { AutomationKpis } from './@components/automation-kpis.js';
import { TrackedCasesTable } from './@components/tracked-cases-table.js';
import { useAutomationSearch } from './@hooks/use-automation-search.js';
import { type AutomationSearch, automationSearchSchema } from './@interface/automation.interface.js';

const number = new Intl.NumberFormat('pt-BR');
const formatNumber = (value: number) => number.format(value);
const headingClass = 'text-xl font-semibold tracking-tight text-impact';
const indicator = (variant: string) => `var(--status-${variant}-indicator)`;

// What happened to the suggestions: here the color is the state (approved green, rejected red, waiting amber).
const OUTCOME_COLOR: Record<SuggestionOutcome, string> = {
  accepted: indicator('success'),
  rejected: indicator('error'),
  pending: indicator('warning'),
  expired: NEUTRAL_COLOR,
  superseded: NEUTRAL_COLOR,
};

// Automação processual (the Datajud automation) as a panel (PAT-01 to PAT-05), macro → micro: the strip with what the automation did in the period
// and what waits for approval, the activity month by month with the constancy of the daily query, what happened to
// the suggestions and the situation of the cases, and the list of tracked cases, newest movement first. The rules on
// their own page and the period in the "…" menu. Without the module, the offer (AD-276).
export function AutomationPage() {
  const session = useQuery(sessionQuery).data;
  const active = Boolean(session && hasAutomationSession(session));
  const navigate = useNavigate();
  const {
    search,
    update,
    searchInput,
    handleSearchInput,
    handlePaginationChange,
    sorting,
    handleSortingChange,
    openCase,
  } = useAutomationSearch();
  const months = search.months;
  const dashboard = useQuery({ ...automationDashboardQuery, enabled: active });
  const list = useQuery({
    ...trackedCasesQuery({
      page: search.page,
      limit: search.limit,
      q: search.q || undefined,
      state: search.state,
      sort: search.sort,
      order: search.order,
    }),
    enabled: active,
  });

  // Complete months only (the one in progress would end every line in a false drop, AD-256).
  const complete = dashboard.data?.byMonth.slice(0, -1) ?? [];
  const period = complete.slice(-months);
  const since = dashboard.data?.since;
  const countingSince = since && period[0] && since > `${period[0].month}-01` ? since : undefined;
  // Before the first day record (the worker that writes it is new), the day-based numbers are zero: say why.
  const countingNote = !dashboard.data
    ? undefined
    : !since
      ? t('counting_from_next_query')
      : countingSince && `${t('counting_since')} ${formatDate(new Date(`${countingSince}T12:00:00`))}.`;
  const items = list.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((list.data?.total ?? 0) / search.limit));
  const filtering = Boolean(search.q || search.state);

  return (
    <Card asPage>
      <CardHeader
        title={t('automation_offer_title')}
        description={active ? t(PERIOD_SCOPE[months]) : t('automation_page_description')}
      >
        {active && (
          <CardAction>
            <PageMenu>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t('period')}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={String(months)}
                  onValueChange={(value) => update({ months: Number(value) as AutomationSearch['months'] })}
                >
                  {PERIODS.map((value) => (
                    <DropdownMenuRadioItem key={value} value={String(value)}>
                      {t(PERIOD_LABEL[value])}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: '/automation/rules' })}>
                {t('automation_rules')}
              </DropdownMenuItem>
            </PageMenu>
          </CardAction>
        )}
      </CardHeader>
      {active && dashboard.data && <AutomationKpis dashboard={dashboard.data} complete={complete} months={months} />}
      <CardContent className="gap-10 pb-16">
        {!active ? (
          <AutomationOffer />
        ) : (
          <>
            {dashboard.isLoading ? (
              <DefaultLoading />
            ) : !dashboard.data ? (
              <DefaultEmptyData
                title={t('load_error')}
                action={<Button onClick={() => void dashboard.refetch()}>{t('try_again')}</Button>}
              />
            ) : (
              <>
                {countingNote && <ItemDescription className="line-clamp-none">{countingNote}</ItemDescription>}
                <section className="flex w-full min-w-0 flex-col gap-5">
                  <div className="grid gap-1">
                    <ItemTitle role="heading" aria-level={2} className={headingClass}>
                      {t('automation_activity')}
                    </ItemTitle>
                    <ItemDescription>{t('automation_activity_scope')}</ItemDescription>
                  </div>
                  <AutomationActivityChart data={period} />
                  <MonthDetails>
                    <ActivityMonthTable data={period} />
                  </MonthDetails>
                </section>
                <div className="grid gap-10 lg:grid-cols-2">
                  <section className="flex w-full min-w-0 flex-col gap-5">
                    <div className="grid gap-1">
                      <ItemTitle role="heading" aria-level={2} className={headingClass}>
                        {t('suggestions_outcome')}
                      </ItemTitle>
                      <ItemDescription>{t('suggestions_outcome_scope')}</ItemDescription>
                    </div>
                    <OutcomeDonut period={period} />
                  </section>
                  <section className="flex w-full min-w-0 flex-col gap-5">
                    <div className="grid gap-1">
                      <ItemTitle role="heading" aria-level={2} className={headingClass}>
                        {t('tracked_cases_situation')}
                      </ItemTitle>
                      <ItemDescription>{t('tracked_cases_situation_scope')}</ItemDescription>
                    </div>
                    <SituationDonut tracked={dashboard.data.tracked} />
                  </section>
                </div>
              </>
            )}
            <section className="flex w-full min-w-0 flex-col gap-5">
              <div className="grid gap-1">
                <ItemTitle role="heading" aria-level={2} className={headingClass}>
                  {t('tracked_cases')}
                </ItemTitle>
                <ItemDescription>{t('tracked_cases_description')}</ItemDescription>
              </div>
              <DataTable
                search={{ value: searchInput, onChange: handleSearchInput }}
                filters={{
                  options: {
                    label: t('situation'),
                    items: TRACKED_CASE_STATUSES.map((status) => ({ value: status, label: trackedCaseLabel(status) })),
                    value: search.state?.[0],
                    onChange: (state) => update({ state: state ? [state as TrackedCaseStatus] : undefined, page: 1 }),
                  },
                }}
              >
                {list.isLoading ? (
                  <DefaultLoading />
                ) : list.isError ? (
                  <DefaultEmptyData
                    title={t('load_error')}
                    action={<Button onClick={() => void list.refetch()}>{t('try_again')}</Button>}
                  />
                ) : !items.length ? (
                  <DefaultEmptyData title={filtering ? t('no_records_match_filters') : t('no_tracked_cases')} />
                ) : (
                  <TrackedCasesTable
                    data={items}
                    pageCount={pageCount}
                    pageIndex={search.page - 1}
                    pageSize={search.limit}
                    onPaginationChange={handlePaginationChange}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    onRowClick={openCase}
                  />
                )}
              </DataTable>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// What happened to the suggestions made in the period (PAT-05).
function OutcomeDonut({ period }: { period: AutomationDashboard['byMonth'] }) {
  const totals = new Map<SuggestionOutcome, number>();
  for (const row of period)
    for (const [status, count] of Object.entries(row.byStatus) as [SuggestionOutcome, number][])
      totals.set(status, (totals.get(status) ?? 0) + count);
  if (![...totals.values()].some(Boolean)) return <DefaultEmptyData title={t('no_data_yet')} />;
  return (
    <CompositionDonut
      label={t('suggestions_outcome')}
      format={formatNumber}
      slices={[...totals].map(([status, count]) => ({
        key: status,
        label: t(status),
        amount: count,
        value: formatNumber(count),
        color: OUTCOME_COLOR[status],
      }))}
    />
  );
}

// The tracked cases now by the court's answer; each part filters the list below.
function SituationDonut({ tracked }: { tracked: AutomationDashboard['tracked'] }) {
  if (!tracked.total) return <DefaultEmptyData title={t('no_tracked_cases')} />;
  return (
    <CompositionDonut
      label={t('tracked_cases_situation')}
      format={formatNumber}
      slices={TRACKED_CASE_STATUSES.map((status) => ({
        key: status,
        label: trackedCaseLabel(status),
        amount: tracked.byState[status],
        value: formatNumber(tracked.byState[status]),
        color: indicator(TRACKED_CASE_VARIANT[status]),
        render: (
          <Link
            to="/automation"
            search={(prev: AutomationSearch) => ({ ...prev, state: [status], page: 1 })}
            replace
            resetScroll={false}
          />
        ),
      }))}
    />
  );
}

export const Route = createFileRoute('/_private/automation/')({
  component: AutomationPage,
  staticData: { title: t('automation_offer_title') },
  validateSearch: (search: Record<string, unknown>): AutomationSearch => automationSearchSchema.parse(search),
});
