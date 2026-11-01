import { Button } from '@ethica/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { FinanceReportForm } from './@components/finance-report-form.js';

const REPORTS = [
  { path: '/documents/deadlines', title: 'deadline_schedule', description: 'deadline_schedule_description' },
  { path: '/documents/stalled', title: 'stalled_cases', description: 'stalled_cases_description' },
] as const;

// DOC-03: management reports as PDF. Finance only shows up for admin/manager (AD-107).
export function ReportsPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const { download, pending } = useFileDownload();
  return (
    <Card asPage>
      <CardHeader title={t('reports')} description={t('reports_page_description')} />
      <CardContent className="max-w-4xl gap-6">
        {REPORTS.map((report) => (
          <Panel
            key={report.path}
            size="sm"
            title={t(report.title)}
            description={t(report.description)}
            actions={
              <Button variant="outline" disabled={pending === report.path} onClick={() => download(report.path)}>
                {t('generate_pdf')}
              </Button>
            }
          />
        ))}
        {can(session, 'finance') && (
          <Panel size="sm" title={t('financial_report')} description={t('financial_report_description')}>
            <FinanceReportForm />
          </Panel>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/reports/')({
  component: ReportsPage,
  staticData: { title: t('reports') },
});
