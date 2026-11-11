import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeExport } from '../@components/office-export.js';
import { OfficeSectionPage } from '../@components/office-section-page.js';
import { OfficeStorage } from '../@components/office-storage.js';

export function OfficeDataPage() {
  return (
    <OfficeSectionPage
      title={t('office_data')}
      sections={(office) => [
        {
          title: t('storage'),
          description: t('storage_description'),
          fields: [<OfficeStorage key="storage" office={office} />],
        },
        {
          title: t('export_data'),
          description: t('export_data_description'),
          fields: [<OfficeExport key="export" office={office} />],
        },
      ]}
    />
  );
}

export const Route = createFileRoute('/_private/_admin/office/data/')({
  component: OfficeDataPage,
  staticData: { title: t('office_data') },
});
