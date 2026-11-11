import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { PdfActions, ReportPage } from '../@components/report-page.js';

export function StalledReportPage() {
  return (
    <ReportPage
      title="stalled_cases"
      contents={['open_over_60_days', 'phase_court_and_division', 'since_and_days_stalled']}
    >
      <PdfActions path="/documents/stalled" />
    </ReportPage>
  );
}

export const Route = createFileRoute('/_private/reports/stalled/')({
  component: StalledReportPage,
  staticData: { title: t('stalled_cases') },
});
