import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeSectionPage } from '../@components/office-section-page.js';
import { OfficeSignatories } from '../@components/office-signatories.js';

export function SignatoriesPage() {
  return (
    <OfficeSectionPage
      title={t('technical_responsibles')}
      sections={() => [
        {
          title: t('technical_responsibles'),
          description: t('technical_responsibles_description'),
          fields: [<OfficeSignatories key="signatories" />],
        },
      ]}
    />
  );
}

export const Route = createFileRoute('/_private/_admin/office/signatories/')({
  component: SignatoriesPage,
  staticData: { title: t('technical_responsibles') },
});
