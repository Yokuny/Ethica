import { Badge } from '@ethica/ui/components/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { useEffect } from 'react';
import { AppLink } from '@/components/app-link.js';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { readDraft } from '@/lib/offline/store.js';
import { iniciarSync } from '@/lib/offline/sync.js';
import { inspectionQuery } from '@/query/inspection.js';
import { FieldConnection } from '../@components/field-connection.js';
import { RegistroForm } from './@components/registro-form.js';
import { type InspectionSearch, inspectionSearchSchema } from './@interface/inspection.interface.js';

// Registro da vistoria no celular (CAM-02 a CAM-07), funcionando sem conexão (AD-128).
export function InspectionPage() {
  const search = useSearch({ strict: false }) as InspectionSearch;
  const queryClient = useQueryClient();
  const query = useQuery({ ...inspectionQuery(search.id), networkMode: 'always', retry: false });
  // O rascunho do aparelho manda sobre a cópia do servidor ao abrir.
  const draft = useQuery({
    queryKey: ['draft', search.id],
    queryFn: async () => (await readDraft(search.id)) ?? null,
    networkMode: 'always',
    staleTime: Number.POSITIVE_INFINITY,
  });
  const item = query.data;

  useEffect(() => iniciarSync(queryClient), [queryClient]);

  return (
    <Card asPage>
      <CardHeader title={t('inspection_record')} />
      {query.isLoading || draft.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !item ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <CardContent className="max-w-4xl gap-6">
          <RecordHeader>
            <RecordHeading
              icon={<ClipboardList />}
              label={formatDateTime(item.appointment.inicio)}
              title={item.appointment.titulo}
              badge={
                <Badge variant={APPOINTMENT_TYPE_VARIANT[item.appointment.tipo]}>{t(item.appointment.tipo)}</Badge>
              }
              description={
                item.legalCase ? (
                  <AppLink to="/expert-cases/details" search={{ id: item.legalCase.id }} as="description">
                    {item.legalCase.processNumber}
                  </AppLink>
                ) : (
                  item.appointment.local
                )
              }
            />
          </RecordHeader>
          <FieldConnection />
          <RegistroForm key={item.appointment.id} item={item} draft={draft.data ?? undefined} />
        </CardContent>
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/inspection/')({
  component: InspectionPage,
  staticData: { title: t('inspection_record') },
  validateSearch: (search: Record<string, unknown>): InspectionSearch => inspectionSearchSchema.parse(search),
});
