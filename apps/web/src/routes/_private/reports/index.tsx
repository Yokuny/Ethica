import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { FinanceReportForm } from './@components/finance-report-form.js';
import { PdfActions } from './@components/pdf-actions.js';

// DOC-03: every management report on one page, one section per report like the office page (AD-227, AD-295).
// Finance only for who sees finance (AD-107).
export function ReportsPage() {
  const session = useQuery(sessionQuery).data;
  const describe = (keys: string[]) => keys.map((key) => t(key)).join(' · ');
  const sections = [
    {
      title: t('deadline_schedule'),
      description: describe(['pending_deadlines_by_due_date', 'status_and_days_left', 'process_of_each_deadline']),
      content: <PdfActions path="/documents/deadlines" />,
    },
    {
      title: t('stalled_cases'),
      description: describe(['open_over_60_days', 'phase_court_and_division', 'since_and_days_stalled']),
      content: <PdfActions path="/documents/stalled" />,
    },
    ...(session && can(session, 'finance')
      ? [
          {
            title: t('financial_report'),
            description: describe([
              'income_expense_and_net_balance',
              'receivable_and_payable',
              'expected_balance_of_period',
            ]),
            content: <FinanceReportForm />,
          },
        ]
      : []),
  ];
  return (
    <Card asPage>
      <CardHeader title={t('reports')} description={t('management_reports_hub_text')} />
      <CardContent className="gap-0 pb-16">
        {sections.map((section) => (
          <section
            key={section.title}
            aria-label={section.title}
            className="grid gap-4 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10"
          >
            <div className="flex flex-col gap-1">
              <ItemTitle role="heading" aria-level={2} className="text-base">
                {section.title}
              </ItemTitle>
              <ItemDescription className="line-clamp-none">{section.description}</ItemDescription>
            </div>
            <div className="min-w-0">{section.content}</div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/reports/')({
  component: ReportsPage,
  staticData: { title: t('reports') },
});
