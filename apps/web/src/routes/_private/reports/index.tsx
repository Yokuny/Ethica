import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarClock, Eye, FileDown, FileText, Hourglass, Wallet } from 'lucide-react';
import { HubIllustration } from '@/components/hub-illustration.js';
import { LinkCard, LinkCardList } from '@/components/link-card.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PageIntro } from '@/components/page-intro.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';

// DOC-03 hub: one page per management report. Finance only for who sees finance (AD-107).
export function ReportsPage() {
  const session = useQuery(sessionQuery).data;
  return (
    <Card asPage>
      <CardHeader title={t('reports')} />
      <CardContent className="max-w-4xl gap-8">
        <PageIntro
          title={t('reports')}
          description={t('reports_page_description')}
          illustration={<HubIllustration icon={FileText} />}
          heading={t('office_numbers_on_paper')}
          text={t('management_reports_hub_text')}
          features={[
            { icon: Eye, label: t('preview_pdf') },
            { icon: FileDown, label: t('generate_pdf') },
          ]}
        />
        <LinkCardList>
          <LinkCard
            icon={CalendarClock}
            title={t('deadline_schedule')}
            meta={[t('pending_deadlines_by_due_date')]}
            render={<Link to="/reports/deadlines" />}
          />
          <LinkCard
            icon={Hourglass}
            title={t('stalled_cases')}
            meta={[t('open_over_60_days')]}
            render={<Link to="/reports/stalled" />}
          />
          {session && can(session, 'finance') && (
            <LinkCard
              icon={Wallet}
              title={t('financial_report')}
              meta={[t('income_expense_and_net_balance')]}
              render={<Link to="/reports/finance" />}
            />
          )}
        </LinkCardList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/reports/')({
  component: ReportsPage,
  staticData: { title: t('reports') },
});
