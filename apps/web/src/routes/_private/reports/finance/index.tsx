import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { ReportPage } from '../@components/report-page.js';
import { FinanceReportForm } from './@components/finance-report-form.js';

// Values only for who sees finance (AD-107): the guard of `_private/route.tsx` maps this page to `finance`.
export function FinanceReportPage() {
  return (
    <ReportPage
      title="financial_report"
      contents={['income_expense_and_net_balance', 'receivable_and_payable', 'expected_balance_of_period']}
    >
      <FinanceReportForm />
    </ReportPage>
  );
}

export const Route = createFileRoute('/_private/reports/finance/')({
  component: FinanceReportPage,
  staticData: { title: t('financial_report') },
});
