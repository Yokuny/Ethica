import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { StepItem, StepList } from '@/components/step-list.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeExport } from './@components/office-export.js';
import { OfficeLogo } from './@components/office-logo.js';
import { OfficeScheduleNotice } from './@components/office-schedule-notice.js';
import { OfficeServiceOrder } from './@components/office-service-order.js';
import { OfficeSignatories } from './@components/office-signatories.js';
import { OfficeStorage } from './@components/office-storage.js';
import { OfficeTextsForm } from './@components/office-texts-form.js';
import { officeQuery } from './@query/office.js';

// DOC-01 and DOC-04 (admin only): every office setting on one page, in steps (AD-224).
// Each step saves through its own API route, so each one keeps its own save button.
export function OfficePage() {
  const query = useQuery(officeQuery);
  const office = query.data;
  return (
    <Card asPage>
      <CardHeader title={t('office')} />
      <CardContent>
        {query.isLoading ? (
          <DefaultLoading />
        ) : !office ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => query.refetch()}>{t('try_again')}</Button>}
          />
        ) : (
          <StepList title={t('your_office_in_every_document')} description={t('office_hub_text')}>
            <StepItem title={t('logo')} description={t('logo_description')}>
              <OfficeLogo logo={office.logo} />
            </StepItem>
            <StepItem title={t('header_and_footer')} description={t('header_and_footer_description')}>
              <OfficeTextsForm office={office} />
            </StepItem>
            <StepItem title={t('service_order_control')} description={t('service_order_control_description')}>
              <OfficeServiceOrder />
            </StepItem>
            <StepItem title={t('technical_responsibles')} description={t('technical_responsibles_description')}>
              <OfficeSignatories />
            </StepItem>
            <StepItem title={t('scheduling_notice')} description={t('scheduling_notice_description')}>
              <OfficeScheduleNotice />
            </StepItem>
            <StepItem title={t('storage')} description={t('storage_description')}>
              <OfficeStorage office={office} />
            </StepItem>
            <StepItem title={t('export_data')} description={t('export_data_description')}>
              <OfficeExport office={office} />
            </StepItem>
          </StepList>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/_admin/office/')({
  component: OfficePage,
  staticData: { title: t('office') },
});
