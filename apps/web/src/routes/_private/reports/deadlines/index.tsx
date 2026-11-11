import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { PdfActions, ReportPage } from '../@components/report-page.js';

export function DeadlinesReportPage() {
  return (
    <ReportPage
      title="deadline_schedule"
      contents={['pending_deadlines_by_due_date', 'status_and_days_left', 'process_of_each_deadline']}
    >
      <PdfActions path="/documents/deadlines" />
    </ReportPage>
  );
}

export const Route = createFileRoute('/_private/reports/deadlines/')({
  component: DeadlinesReportPage,
  staticData: { title: t('deadline_schedule') },
});
