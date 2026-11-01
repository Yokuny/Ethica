import { Badge } from '@ethica/ui/components/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { useEffect } from 'react';
import { AppLink } from '@/components/app-link.js';
import { COMPROMISSO_TIPO_VARIANT } from '@/components/compromisso-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { lerRascunho } from '@/lib/offline/store.js';
import { iniciarSync } from '@/lib/offline/sync.js';
import { vistoriaQuery } from '@/query/vistoria.js';
import { CampoConexao } from '../@components/campo-conexao.js';
import { RegistroForm } from './@components/registro-form.js';
import { type VistoriaSearch, vistoriaSearchSchema } from './@interface/vistoria.interface.js';

// Registro da vistoria no celular (CAM-02 a CAM-07), funcionando sem conexão (AD-128).
export function VistoriaPage() {
  const search = useSearch({ strict: false }) as VistoriaSearch;
  const queryClient = useQueryClient();
  const query = useQuery({ ...vistoriaQuery(search.id), networkMode: 'always', retry: false });
  // O rascunho do aparelho manda sobre a cópia do servidor ao abrir.
  const rascunho = useQuery({
    queryKey: ['rascunho', search.id],
    queryFn: async () => (await lerRascunho(search.id)) ?? null,
    networkMode: 'always',
    staleTime: Number.POSITIVE_INFINITY,
  });
  const item = query.data;

  useEffect(() => iniciarSync(queryClient), [queryClient]);

  return (
    <Card asPage>
      <CardHeader title={t('inspection_record')} />
      {query.isLoading || rascunho.isLoading ? (
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
              label={formatDateTime(item.compromisso.inicio)}
              title={item.compromisso.titulo}
              badge={
                <Badge variant={COMPROMISSO_TIPO_VARIANT[item.compromisso.tipo]}>{t(item.compromisso.tipo)}</Badge>
              }
              description={
                item.legalCase ? (
                  <AppLink to="/expert-cases/details" search={{ id: item.legalCase.id }} as="description">
                    {item.legalCase.processNumber}
                  </AppLink>
                ) : (
                  item.compromisso.local
                )
              }
            />
          </RecordHeader>
          <CampoConexao />
          <RegistroForm key={item.compromisso.id} item={item} rascunho={rascunho.data ?? undefined} />
        </CardContent>
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/inspection/')({
  component: VistoriaPage,
  staticData: { title: t('inspection_record') },
  validateSearch: (search: Record<string, unknown>): VistoriaSearch => vistoriaSearchSchema.parse(search),
});
