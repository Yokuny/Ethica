import { Button } from '@ethica/ui/components/button';
import { DropdownMenuItem } from '@ethica/ui/components/dropdown-menu';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { casesQuery, serviceOrderPreviewQuery } from '@/query/case.js';
import { listStatsQuery } from '@/query/listStats.js';
import { preferencesQuery, updatePreferencesMutation } from '@/query/preferences.js';
import { can, sessionQuery } from '@/query/session.js';
import { revenueGoalQuery } from '@/query/transaction.js';
import { CasesOverview } from './@components/cases-overview.js';
import { CasesRevenueGoal } from './@components/cases-revenue-goal.js';
import { CasesTable } from './@components/cases-table.js';
import { useCasesFilters } from './@hooks/use-cases-filters.js';
import { useCasesSearch } from './@hooks/use-cases-search.js';
import { type CasesSearch, casesSearchSchema } from './@interface/cases.interface.js';
import { caseExportColumns } from './@utils/case-columns.js';

export function CasesIndexPage() {
  const {
    search,
    searchInput,
    handleSearchInput,
    handlePaginationChange,
    sorting,
    handleSortingChange,
    handleRowClick,
    update,
    hasFilters,
    clearFilters,
  } = useCasesSearch();
  const params = {
    q: search.q || undefined,
    phase: search.phase,
    status: search.status,
    courtType: search.courtType,
    role: search.role,
    serviceType: search.serviceType,
    serviceOrder: search.serviceOrder || undefined,
    sort: search.sort,
    order: search.order,
    deliveryFrom: search.deliveryFrom,
    deliveryTo: search.deliveryTo,
  };
  const query = useQuery(casesQuery({ ...params, page: search.page, limit: search.limit }));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const filters = useCasesFilters(search, update);
  const statsQuery = useQuery(listStatsQuery('/expert-cases/stats'));
  const serviceOrder = useQuery(serviceOrderPreviewQuery).data;
  const session = useQuery(sessionQuery).data;
  const canCreate = Boolean(session && can(session, 'expert_cases', 'create'));
  const canSeeFinance = Boolean(session && can(session, 'finance'));
  // Revenue goal (MRA-04): each person who sees Finance chooses to follow it here.
  const goal = useQuery({ ...revenueGoalQuery, enabled: canSeeFinance }).data;
  const preferences = useQuery({ ...preferencesQuery, enabled: canSeeFinance }).data;
  const savePreferences = useMutation(updatePreferencesMutation(queryClient));
  const goalCents = goal?.goalCents;
  const followsGoal = Boolean(goal && goalCents && preferences?.revenueGoalOnCases);
  const toggleGoal = () =>
    savePreferences.mutate(
      { revenueGoalOnCases: !preferences?.revenueGoalOnCases },
      { onError: (error) => toast.error(error.message) },
    );
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / search.limit));

  return (
    <Card asPage>
      <CardHeader title={t('expert_cases')} description={t('track_each_expert_case_from_appointment_to_report')}>
        <CardAction>
          {canCreate && (
            <Button nativeButton={false} role="link" render={<Link to="/expert-cases/add">{t('add')}</Link>} />
          )}
          {(canCreate || Boolean(goalCents && preferences)) && (
            <PageMenu>
              {canCreate && (
                <DropdownMenuItem onClick={() => navigate({ to: '/expert-cases/import' })}>
                  {t('import_spreadsheet')}
                </DropdownMenuItem>
              )}
              {Boolean(goalCents) && preferences && (
                <DropdownMenuItem onClick={toggleGoal}>
                  {t(followsGoal ? 'hide_goal_here' : 'follow_goal_here')}
                </DropdownMenuItem>
              )}
            </PageMenu>
          )}
        </CardAction>
      </CardHeader>
      <CasesOverview stats={statsQuery.data} />
      <CardContent>
        {/* Next service order (a preview of the sequence, AD-190) and the last one used, as a discreet line. */}
        {(serviceOrder?.next || serviceOrder?.last || followsGoal) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 justify-end">
            {followsGoal && goal && goalCents && <CasesRevenueGoal goal={{ ...goal, goalCents }} />}
            {[
              { label: t('next_service_order'), value: serviceOrder?.next },
              { label: t('last_service_order'), value: serviceOrder?.last },
            ].map(
              (item) =>
                item.value && (
                  <div key={item.label} className="flex items-baseline gap-1.5">
                    <ItemDescription>{item.label}</ItemDescription>
                    <ItemTitle className="font-normal">{item.value}</ItemTitle>
                  </div>
                ),
            )}
          </div>
        )}
        <DataTable
          filters={{ items: filters }}
          search={{ value: searchInput, onChange: handleSearchInput }}
          export={{
            title: t('expert_cases'),
            columns: caseExportColumns(canSeeFinance),
            rows: items,
            fetchPage: (page, limit) => queryClient.fetchQuery(casesQuery({ ...params, page, limit })),
          }}
        >
          {query.isLoading ? (
            <DefaultLoading />
          ) : query.isError ? (
            <DefaultEmptyData
              title={t('load_error')}
              action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
            />
          ) : !items.length ? (
            hasFilters ? (
              <DefaultEmptyData
                title={t('no_records_match_filters')}
                action={<Button onClick={clearFilters}>{t('clear_filters')}</Button>}
              />
            ) : (
              <DefaultEmptyData title={t('no_expert_cases_yet')} description={t('use_add_to_create_first')} />
            )
          ) : (
            <CasesTable
              canSeeFinance={canSeeFinance}
              data={items}
              pageCount={pageCount}
              pageIndex={search.page - 1}
              pageSize={search.limit}
              onPaginationChange={handlePaginationChange}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              onRowClick={handleRowClick}
            />
          )}
        </DataTable>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-cases/')({
  component: CasesIndexPage,
  staticData: { title: t('expert_cases') },
  validateSearch: (search: Record<string, unknown>): CasesSearch => casesSearchSchema.parse(search),
});
