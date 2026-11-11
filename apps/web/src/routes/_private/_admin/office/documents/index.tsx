import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeLogo } from '../@components/office-logo.js';
import { OfficeSectionPage } from '../@components/office-section-page.js';
import { OfficeTextsForm } from '../@components/office-texts-form.js';

export function DocumentIdentityPage() {
  return (
    <OfficeSectionPage
      title={t('document_identity')}
      sections={(office) => [
        {
          title: t('logo'),
          description: t('logo_description'),
          fields: [<OfficeLogo key="logo" logo={office.logo} />],
        },
        {
          title: t('header_and_footer'),
          description: t('header_and_footer_description'),
          fields: [<OfficeTextsForm key="texts" office={office} />],
        },
      ]}
    />
  );
}

export const Route = createFileRoute('/_private/_admin/office/documents/')({
  component: DocumentIdentityPage,
  staticData: { title: t('document_identity') },
});
