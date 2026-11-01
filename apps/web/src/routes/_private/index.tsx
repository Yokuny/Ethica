import { HOME_BLOCOS, type HomeBloco } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { FinanceFlowChart } from '@/components/finance-flow-chart.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { UpcomingAppointments } from '@/components/upcoming-appointments.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { upcomingAppointmentsQuery } from '@/query/appointment.js';
import { caseDistributionQuery, stalledCasesQuery } from '@/query/case.js';
import { listStatsQuery } from '@/query/listStats.js';
import { preferencesQuery } from '@/query/preferences.js';
import { can } from '@/query/session.js';
import { financeSummaryQuery, monthlyFlowQuery } from '@/query/transaction.js';
import { CasesCourtTypeChart } from './@components/cases-court-type-chart.js';
import { CasesStatusChart } from './@components/cases-status-chart.js';
import { HomeOverview } from './@components/home-overview.js';
import { HomePersonalizar } from './@components/home-personalizar.js';
import { HomeSections } from './@components/home-sections.js';
import { StalledCasesList } from './@components/stalled-cases.js';
import { HOME_BLOCO_MODULO } from './@consts/home-blocos.js';
import { useHomePage } from './@hooks/use-home-page.js';

const FLOW_MONTHS = 6;

// Início configurável por usuário (AD-136): só os blocos que a matriz deixa ver (AD-137),
// menos os que a pessoa escondeu.
export function PrivateIndexPage() {
  const { session, canSeeFinance, sections } = useHomePage();
  const preferences = useQuery(preferencesQuery);
  const [personalizando, setPersonalizando] = useState(false);
  const permitidos = HOME_BLOCOS.filter((bloco) => {
    const modulo = HOME_BLOCO_MODULO[bloco];
    return !modulo || can(session, modulo);
  });
  const ocultos = preferences.data?.blocosOcultos ?? [];
  const mostra = (bloco: HomeBloco) => permitidos.includes(bloco) && !ocultos.includes(bloco);
  const canCreate = can(session, 'expert_cases', 'create');

  const stats = useQuery({ ...listStatsQuery('/expert-cases/stats'), enabled: mostra('overview') });
  const distribution = useQuery({
    ...caseDistributionQuery,
    enabled: mostra('by_stage') || mostra('by_court'),
  });
  const stalled = useQuery({ ...stalledCasesQuery, enabled: mostra('stalled') });
  const upcoming = useQuery({ ...upcomingAppointmentsQuery({ limit: 5 }), enabled: mostra('upcoming') });
  const summary = useQuery({ ...financeSummaryQuery, enabled: canSeeFinance && mostra('overview') });
  const flow = useQuery({ ...monthlyFlowQuery(FLOW_MONTHS), enabled: mostra('cash_flow') });

  return (
    <Card asPage>
      <CardHeader title={t('home')}>
        <CardAction>
          <Button variant="outline" onClick={() => setPersonalizando(true)}>
            {t('customize')}
          </Button>
          {canCreate && (
            <Button
              nativeButton={false}
              role="link"
              render={<Link to="/expert-cases/add">{t('new_expert_case')}</Link>}
            />
          )}
        </CardAction>
      </CardHeader>
      {mostra('overview') && <HomeOverview stats={stats.data} summary={canSeeFinance ? summary.data : undefined} />}
      <CardContent className="gap-10 pb-16">
        {mostra('upcoming') && (
          <Panel size="sm" title={t('upcoming_commitments')}>
            {upcoming.isLoading ? (
              <DefaultLoading />
            ) : !upcoming.data?.length ? (
              <DefaultEmptyData title={t('nothing_scheduled')} description={t('commitments_appear_here')} />
            ) : (
              <UpcomingAppointments items={upcoming.data} />
            )}
          </Panel>
        )}
        {mostra('stalled') && (
          <Panel size="sm" title={t('stalled_expert_cases')}>
            {stalled.isLoading ? (
              <DefaultLoading />
            ) : !stalled.data?.total ? (
              <DefaultEmptyData title={t('no_stalled_expert_cases')} />
            ) : (
              <StalledCasesList stalled={stalled.data} />
            )}
          </Panel>
        )}
        {mostra('cash_flow') && (
          <Panel size="sm" title={t('cash_flow')} description={t('last_6_months')}>
            {flow.isLoading ? <DefaultLoading /> : flow.data && <FinanceFlowChart data={flow.data} />}
          </Panel>
        )}
        {(mostra('by_stage') || mostra('by_court')) && (
          <div className="grid gap-10 lg:grid-cols-2">
            {mostra('by_stage') && (
              <Panel size="sm" title={t('expert_cases_by_stage')}>
                {distribution.isLoading ? (
                  <DefaultLoading />
                ) : (
                  <CasesStatusChart groups={distribution.data?.status ?? []} />
                )}
              </Panel>
            )}
            {mostra('by_court') && (
              <Panel size="sm" title={t('expert_cases_by_court')}>
                {distribution.isLoading ? (
                  <DefaultLoading />
                ) : !distribution.data?.courtType.length ? (
                  <DefaultEmptyData title={t('no_expert_cases_yet')} />
                ) : (
                  <CasesCourtTypeChart groups={distribution.data.courtType} />
                )}
              </Panel>
            )}
          </div>
        )}
        {mostra('sections') && <HomeSections sections={sections} />}
      </CardContent>
      {personalizando && (
        <HomePersonalizar blocos={permitidos} ocultos={ocultos} onClose={() => setPersonalizando(false)} />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/')({ component: PrivateIndexPage, staticData: { title: t('home') } });
