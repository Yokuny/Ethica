import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { Briefcase, Contact, User } from 'lucide-react';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { partyIdentification } from '@/components/party-labels.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partyQuery } from '@/query/party.js';
import { PartyForm } from '../@components/party-form.js';
import { PartyCases } from './@components/party-cases.js';
import { type PartyDetailsSearch, partyDetailsSearchSchema } from './@interface/party-details.interface.js';

export function PartyDetailsPage() {
  const search = useSearch({ strict: false }) as PartyDetailsSearch;
  const query = useQuery({ ...partyQuery(search.id), retry: false });
  const party = query.data;
  const [editing, setEditing] = useState(false);

  return (
    <Card asPage>
      <CardHeader title={t('details')}>
        {party && (
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
      ) : !party ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <CardContent className="gap-10">
          <RecordHeader>
            <RecordHeading
              icon={party.tipo === 'lawyer' ? <Briefcase /> : <User />}
              label={t(party.tipo)}
              title={party.nome}
              description={partyIdentification(party)}
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
                    label: party.tipo === 'lawyer' ? 'OAB' : t('cpf_cnpj'),
                    value: partyIdentification(party) ?? '-',
                  },
                  { label: t('email'), value: party.email || '-' },
                  { label: t('phone'), value: party.telefone || '-' },
                ],
              },
            ]}
          />
          <PartyCases partyId={party.id} />
        </CardContent>
      )}
      {editing && party && <PartyForm party={party} onClose={() => setEditing(false)} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/parties/details/')({
  component: PartyDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): PartyDetailsSearch => partyDetailsSearchSchema.parse(search),
});
