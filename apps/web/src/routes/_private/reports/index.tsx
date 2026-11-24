import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { StepItem, StepList } from '@/components/step-list.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { FinanceReportForm } from './@components/finance-report-form.js';
import { PdfActions } from './@components/pdf-actions.js';

// DOC-03: every management report on one page, in steps like the office page (AD-224, AD-227).
// Finance only for who sees finance (AD-107).
export function ReportsPage() {
  const session = useQuery(sessionQuery).data;
  return (
    <Card asPage>
      <CardHeader title={t('reports')} />
      <CardContent>
        <StepList title={t('office_numbers_on_paper')} description={t('management_reports_hub_text')}>
          <StepItem
            title={t('deadline_schedule')}
            description={['pending_deadlines_by_due_date', 'status_and_days_left', 'process_of_each_deadline']
              .map(t)
              .join(' · ')}
          >
            <PdfActions path="/documents/deadlines" />
          </StepItem>
          <StepItem
            title={t('stalled_cases')}
            description={['open_over_60_days', 'phase_court_and_division', 'since_and_days_stalled'].map(t).join(' · ')}
          >
            <PdfActions path="/documents/stalled" />
          </StepItem>
          {session && can(session, 'finance') && (
            <StepItem
              title={t('financial_report')}
              description={['income_expense_and_net_balance', 'receivable_and_payable', 'expected_balance_of_period']
                .map(t)
                .join(' · ')}
            >
              <FinanceReportForm />
            </StepItem>
          )}
        </StepList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/reports/')({
  component: ReportsPage,
  staticData: { title: t('reports') },
});
