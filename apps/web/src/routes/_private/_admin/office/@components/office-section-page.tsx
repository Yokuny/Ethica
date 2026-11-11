import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultFormLayout, type FormSection } from '@/components/default-form-layout.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type OfficeView, officeQuery } from '../@query/office.js';

// One office page: its sections over the office data, loaded once here.
export function OfficeSectionPage({
  title,
  sections,
}: {
  title: string;
  sections: (office: OfficeView) => FormSection[];
}) {
  const query = useQuery(officeQuery);
  const office = query.data;
  return (
    <Card asPage>
      <CardHeader title={title} />
      <CardContent>
        {query.isLoading ? (
          <DefaultLoading />
        ) : !office ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => query.refetch()}>{t('try_again')}</Button>}
          />
        ) : (
          <DefaultFormLayout sections={sections(office)} />
        )}
      </CardContent>
    </Card>
  );
}
