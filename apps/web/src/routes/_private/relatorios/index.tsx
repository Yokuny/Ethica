import { Button } from '@ethica/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { FinanceiroReportForm } from './@components/financeiro-report-form.js';

const REPORTS = [
  { path: '/documentos/prazos', title: 'deadline_schedule', description: 'deadline_schedule_description' },
  { path: '/documentos/paradas', title: 'stalled_cases', description: 'stalled_cases_description' },
] as const;

// DOC-03: relatórios gerenciais em PDF. O financeiro só aparece para admin/manager (AD-107).
export function RelatoriosPage() {
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
        {can(session, 'financeiro') && (
          <Panel size="sm" title={t('financial_report')} description={t('financial_report_description')}>
            <FinanceiroReportForm />
          </Panel>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/relatorios/')({
  component: RelatoriosPage,
  staticData: { title: t('reports') },
});
