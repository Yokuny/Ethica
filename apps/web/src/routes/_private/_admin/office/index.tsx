import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeExport } from './@components/office-export.js';
import { OfficeLogo } from './@components/office-logo.js';
import { OfficeRevenueGoal } from './@components/office-revenue-goal.js';
import { OfficeScheduleNotice } from './@components/office-schedule-notice.js';
import { OfficeServiceOrder } from './@components/office-service-order.js';
import { OfficeSignatories } from './@components/office-signatories.js';
import { OfficeStorage } from './@components/office-storage.js';
import { OfficeTextsForm } from './@components/office-texts-form.js';
import { officeQuery } from './@query/office.js';

// DOC-01 and DOC-04 (admin only): every office setting on one page, one section per subject (AD-295).
// Each step saves through its own API route, so each one keeps its own save button.
export function OfficePage() {
  const query = useQuery(officeQuery);
  const office = query.data;
  const sections = office
    ? [
        { title: t('logo'), description: t('logo_description'), content: <OfficeLogo logo={office.logo} /> },
        {
          title: t('header_and_footer'),
          description: t('header_and_footer_description'),
          content: <OfficeTextsForm office={office} />,
        },
        {
          title: t('service_order_control'),
          description: t('service_order_control_description'),
          content: <OfficeServiceOrder />,
        },
        {
          title: t('technical_responsibles'),
          description: t('technical_responsibles_description'),
          content: <OfficeSignatories />,
        },
        {
          title: t('scheduling_notice'),
          description: t('scheduling_notice_description'),
          content: <OfficeScheduleNotice />,
        },
        {
          title: t('revenue_goal'),
          description: t('revenue_goal_description'),
          content: <OfficeRevenueGoal office={office} />,
        },
        { title: t('storage'), description: t('storage_description'), content: <OfficeStorage office={office} /> },
        {
          title: t('export_data'),
          description: t('export_data_description'),
          content: <OfficeExport office={office} />,
        },
      ]
    : [];
  return (
    <Card asPage>
      <CardHeader title={t('office')} description={t('office_hub_text')} />
      <CardContent className="gap-0 pb-16">
        {query.isLoading ? (
          <DefaultLoading />
        ) : !office ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => query.refetch()}>{t('try_again')}</Button>}
          />
        ) : (
          sections.map((section) => (
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
          ))
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/_admin/office/')({
  component: OfficePage,
  staticData: { title: t('office') },
});
