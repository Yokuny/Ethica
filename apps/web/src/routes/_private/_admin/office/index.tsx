import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { OfficeAvisoAgendamento } from './@components/office-aviso-agendamento.js';
import { OfficeExport } from './@components/office-export.js';
import { OfficeLogo } from './@components/office-logo.js';
import { OfficeStorage } from './@components/office-storage.js';
import { OfficeTextsForm } from './@components/office-texts-form.js';
import { officeQuery } from './@query/office.js';

// DOC-01 e DOC-04: identidade do escritório nos documentos e exportação de dados (só admin).
export function OfficePage() {
  const query = useQuery(officeQuery);
  const office = query.data;
  return (
    <Card asPage>
      <CardHeader title={t('office')} description={t('office_page_description')} />
      <CardContent>
        {query.isLoading ? (
          <DefaultLoading />
        ) : !office ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => query.refetch()}>{t('try_again')}</Button>}
          />
        ) : (
          <DefaultFormLayout
            sections={[
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
              {
                title: t('scheduling_notice'),
                description: t('scheduling_notice_description'),
                fields: [<OfficeAvisoAgendamento key="aviso" />],
              },
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
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/_admin/office/')({
  component: OfficePage,
  staticData: { title: t('office') },
});
