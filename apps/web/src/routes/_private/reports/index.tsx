import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarClock, Hourglass, type LucideIcon, Wallet } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import { FinanceReportForm } from './@components/finance-report-form.js';

const REPORTS = [
  {
    path: '/documents/deadlines',
    title: 'deadline_schedule',
    icon: CalendarClock,
    contents: ['pending_deadlines_by_due_date', 'status_and_days_left', 'process_of_each_deadline'],
  },
  {
    path: '/documents/stalled',
    title: 'stalled_cases',
    icon: Hourglass,
    contents: ['open_over_60_days', 'phase_court_and_division', 'since_and_days_stalled'],
  },
] as const;

const FINANCE_CONTENTS = ['income_expense_and_net_balance', 'receivable_and_payable', 'expected_balance_of_period'];

// One report per row (AD-211): icon and name, what the PDF brings, and the actions on the right.
function ReportRow({
  icon: Icon,
  title,
  contents,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  contents: readonly string[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-border border-b pb-6 md:grid-cols-3">
      <div className="flex items-center gap-4">
        <Icon className="size-5 shrink-0" aria-hidden />
        <ItemTitle
          // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
          render={<h3 />}
          className="font-medium text-base"
        >
          {t(title)}
        </ItemTitle>
      </div>
      <div className="flex flex-col gap-1">
        {contents.map((key) => (
          <ItemDescription key={key} className="line-clamp-none text-sm">
            {t(key)}
          </ItemDescription>
        ))}
      </div>
      {actions && <div className="flex flex-wrap items-start gap-2 md:justify-end">{actions}</div>}
      {children && <div className="md:col-span-3">{children}</div>}
    </div>
  );
}

// DOC-03: management reports as PDF. Finance only shows up for admin/manager (AD-107).
export function ReportsPage() {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const { download, pending } = useFileDownload();
  const [previewing, setPreviewing] = useState<string | null>(null);
  return (
    <Card asPage>
      <CardHeader title={t('reports')} />
      <CardContent>
        <div className="mx-auto w-full max-w-2xl space-y-12">
          <div className="space-y-4">
            <ItemTitle
              // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
              render={<h2 />}
              className="font-semibold text-xl tracking-tight md:text-3xl"
            >
              {t('reports')}
            </ItemTitle>
            <ItemDescription className="line-clamp-none text-lg tracking-tight md:text-xl">
              {t('reports_page_description')}
            </ItemDescription>
          </div>
          <div className="space-y-10">
            {REPORTS.map((report) => (
              <ReportRow
                key={report.path}
                icon={report.icon}
                title={report.title}
                contents={report.contents}
                actions={
                  <>
                    <Button variant="outline" onClick={() => setPreviewing(report.path)}>
                      {t('preview_pdf')}
                    </Button>
                    <Button disabled={pending === report.path} onClick={() => download(report.path)}>
                      {t('generate_pdf')}
                    </Button>
                  </>
                }
              />
            ))}
            {can(session, 'finance') && (
              <ReportRow icon={Wallet} title="financial_report" contents={FINANCE_CONTENTS}>
                <FinanceReportForm />
              </ReportRow>
            )}
          </div>
        </div>
      </CardContent>
      {previewing && (
        <PdfPreviewDialog path={previewing} onClose={() => setPreviewing(null)}>
          <Button disabled={pending === previewing} onClick={() => download(previewing)}>
            {t('generate_pdf')}
          </Button>
        </PdfPreviewDialog>
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/reports/')({
  component: ReportsPage,
  staticData: { title: t('reports') },
});
