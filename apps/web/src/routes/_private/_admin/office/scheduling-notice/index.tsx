import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeScheduleNotice } from '../@components/office-schedule-notice.js';
import { OfficeSectionPage } from '../@components/office-section-page.js';

export function SchedulingNoticePage() {
  return (
    <OfficeSectionPage
      title={t('scheduling_notice')}
      sections={() => [
        {
          title: t('scheduling_notice'),
          description: t('scheduling_notice_description'),
          fields: [<OfficeScheduleNotice key="notice" />],
        },
      ]}
    />
  );
}

export const Route = createFileRoute('/_private/_admin/office/scheduling-notice/')({
  component: SchedulingNoticePage,
  staticData: { title: t('scheduling_notice') },
});
