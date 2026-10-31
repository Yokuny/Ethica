import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ListTree } from 'lucide-react';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { modelosQuery } from '@/query/laudo.js';
import { canManageReportTemplates, sessionQuery } from '@/query/session.js';
import { ModeloCreateForm } from './@components/modelo-create-form.js';

// LAU-01: biblioteca padrão (só leitura) e modelos do escritório.
export function ModelosPage() {
  const navigate = useNavigate({ from: '/laudos/modelos/' });
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery(modelosQuery());
  const [creating, setCreating] = useState(false);
  const podeEditar = canManageReportTemplates(session);

  return (
    <Card asPage>
      <CardHeader title={t('report_templates')} description={t('report_templates_description')}>
        {podeEditar && (
          <CardAction>
            <Button onClick={() => setCreating(true)}>{t('new_template')}</Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="max-w-4xl">
        {query.isLoading ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
          />
        ) : (
          <LinkList>
            {(query.data ?? []).map((modelo) => (
              <LinkListItem
                key={modelo.id}
                icon={ListTree}
                render={<Link to="/laudos/modelos/details" search={{ id: modelo.id }} />}
                title={modelo.nome}
                badges={modelo.padrao && <Badge variant="info">{t('standard')}</Badge>}
                description={[t(modelo.tipo), `${modelo.totalSecoes} ${t('sections').toLowerCase()}`].join(' · ')}
              />
            ))}
          </LinkList>
        )}
      </CardContent>
      {creating && (
        <ModeloCreateForm
          onClose={() => setCreating(false)}
          onDone={(modelo) => navigate({ to: '/laudos/modelos/details', search: { id: modelo.id } })}
        />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/laudos/modelos/')({
  component: ModelosPage,
  staticData: { title: t('report_templates') },
});
