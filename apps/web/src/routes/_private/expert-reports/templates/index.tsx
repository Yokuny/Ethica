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
import { templatesQuery } from '@/query/report.js';
import { can, sessionQuery } from '@/query/session.js';
import { TemplateCreateForm } from './@components/template-create-form.js';

// LAU-01: biblioteca padrão (só leitura) e modelos do escritório.
export function TemplatesPage() {
  const navigate = useNavigate({ from: '/expert-reports/templates/' });
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery(templatesQuery());
  const [creating, setCreating] = useState(false);
  const canEdit = can(session, 'report_templates', 'create');

  return (
    <Card asPage>
      <CardHeader title={t('report_templates')} description={t('report_templates_description')}>
        {canEdit && (
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
            {(query.data ?? []).map((template) => (
              <LinkListItem
                key={template.id}
                icon={ListTree}
                render={<Link to="/expert-reports/templates/details" search={{ id: template.id }} />}
                title={template.name}
                badges={template.isDefault && <Badge variant="info">{t('standard')}</Badge>}
                description={[t(template.type), `${template.totalSections} ${t('sections').toLowerCase()}`].join(' · ')}
              />
            ))}
          </LinkList>
        )}
      </CardContent>
      {creating && (
        <TemplateCreateForm
          onClose={() => setCreating(false)}
          onDone={(template) => navigate({ to: '/expert-reports/templates/details', search: { id: template.id } })}
        />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/templates/')({
  component: TemplatesPage,
  staticData: { title: t('report_templates') },
});
