import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeSectionPage } from '../@components/office-section-page.js';
import { OfficeServiceOrder } from '../@components/office-service-order.js';

export function ServiceOrderPage() {
  return (
    <OfficeSectionPage
      title={t('service_order_control')}
      sections={() => [
        {
          title: t('service_order_control'),
          description: t('service_order_control_description'),
          fields: [<OfficeServiceOrder key="service-order" />],
        },
      ]}
    />
  );
}

export const Route = createFileRoute('/_private/_admin/office/service-order/')({
  component: ServiceOrderPage,
  staticData: { title: t('service_order_control') },
});
