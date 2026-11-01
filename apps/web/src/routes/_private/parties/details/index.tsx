import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { Briefcase, Contact, User } from 'lucide-react';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { identificacaoDaParte } from '@/components/parte-labels.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { parteQuery } from '@/query/parte.js';
import { ParteForm } from '../@components/parte-form.js';
import { PartePericias } from './@components/parte-pericias.js';
import { type ParteDetailsSearch, parteDetailsSearchSchema } from './@interface/parte-details.interface.js';

export function ParteDetailsPage() {
  const search = useSearch({ strict: false }) as ParteDetailsSearch;
  const query = useQuery({ ...parteQuery(search.id), retry: false });
  const parte = query.data;
  const [editing, setEditing] = useState(false);

  return (
    <Card asPage>
      <CardHeader title={t('details')}>
        {parte && (
          <CardAction>
            <Button variant="outline" onClick={() => setEditing(true)}>
              {t('edit')}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      {query.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !parte ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <CardContent className="gap-10">
          <RecordHeader>
            <RecordHeading
              icon={parte.tipo === 'lawyer' ? <Briefcase /> : <User />}
              label={t(parte.tipo)}
              title={parte.nome}
              description={identificacaoDaParte(parte)}
            />
          </RecordHeader>
          <ProductSpecs
            groups={[
              {
                id: 'contato',
                name: t('contact'),
                icon: <Contact />,
                specs: [
                  {
                    label: parte.tipo === 'lawyer' ? 'OAB' : t('cpf_cnpj'),
                    value: identificacaoDaParte(parte) ?? '-',
                  },
                  { label: t('email'), value: parte.email || '-' },
                  { label: t('phone'), value: parte.telefone || '-' },
                ],
              },
            ]}
          />
          <PartePericias parteId={parte.id} />
        </CardContent>
      )}
      {editing && parte && <ParteForm parte={parte} onClose={() => setEditing(false)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/parties/details/')({
  component: ParteDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): ParteDetailsSearch => parteDetailsSearchSchema.parse(search),
});
