import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { FluxoFinanceiroChart } from '@/components/fluxo-financeiro-chart.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { UpcomingCompromissos } from '@/components/upcoming-compromissos.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { upcomingCompromissosQuery } from '@/query/compromisso.js';
import { financeiroResumoQuery, fluxoMensalQuery } from '@/query/lancamento.js';
import { listStatsQuery } from '@/query/listStats.js';
import { periciaDistributionQuery } from '@/query/pericia.js';
import { HomeOverview } from './@components/home-overview.js';
import { HomeSections } from './@components/home-sections.js';
import { PericiasJusticaChart } from './@components/pericias-justica-chart.js';
import { PericiasStatusChart } from './@components/pericias-status-chart.js';
import { useHomePage } from './@hooks/use-home-page.js';

const FLUXO_MESES = 6;

export function PrivateIndexPage() {
  const { canSeeFinance, sections } = useHomePage();
  const stats = useQuery(listStatsQuery('/pericias/stats'));
  const distribution = useQuery(periciaDistributionQuery);
  const upcoming = useQuery(upcomingCompromissosQuery({ limit: 5 }));
  const resumo = useQuery({ ...financeiroResumoQuery, enabled: canSeeFinance });
  const fluxo = useQuery({ ...fluxoMensalQuery(FLUXO_MESES), enabled: canSeeFinance });

  return (
    <Card asPage>
      <CardHeader title={t('home')}>
        <CardAction>
          <Button nativeButton={false} role="link" render={<Link to="/pericias/add">{t('new_pericia')}</Link>} />
        </CardAction>
      </CardHeader>
      <HomeOverview stats={stats.data} resumo={canSeeFinance ? resumo.data : undefined} />
      <CardContent className="gap-10 pb-16">
        <Panel size="sm" title={t('upcoming_commitments')}>
          {upcoming.isLoading ? (
            <DefaultLoading />
          ) : !upcoming.data?.length ? (
            <DefaultEmptyData title={t('nothing_scheduled')} description={t('commitments_appear_here')} />
          ) : (
            <UpcomingCompromissos items={upcoming.data} />
          )}
        </Panel>
        {canSeeFinance && (
          <Panel size="sm" title={t('cash_flow')} description={t('last_6_months')}>
            {fluxo.isLoading ? <DefaultLoading /> : fluxo.data && <FluxoFinanceiroChart data={fluxo.data} />}
          </Panel>
        )}
        <div className="grid gap-10 lg:grid-cols-2">
          <Panel size="sm" title={t('pericias_by_stage')}>
            {distribution.isLoading ? (
              <DefaultLoading />
            ) : (
              <PericiasStatusChart groups={distribution.data?.status ?? []} />
            )}
          </Panel>
          <Panel size="sm" title={t('pericias_by_court')}>
            {distribution.isLoading ? (
              <DefaultLoading />
            ) : !distribution.data?.justica.length ? (
              <DefaultEmptyData title={t('no_pericias_yet')} />
            ) : (
              <PericiasJusticaChart groups={distribution.data.justica} />
            )}
          </Panel>
        </div>
        <HomeSections sections={sections} />
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/')({ component: PrivateIndexPage, staticData: { title: t('home') } });
