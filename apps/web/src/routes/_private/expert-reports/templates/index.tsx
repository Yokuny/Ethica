import { TEMPLATE_AREAS } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { ItemTitle } from '@ethica/ui/components/item';
import { Tabs, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ListTree } from 'lucide-react';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { templateAreaLabel } from '@/components/report-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type TemplateSummary, templatesQuery } from '@/query/report.js';
import { can, sessionQuery } from '@/query/session.js';
import { TemplateCreateForm } from './@components/template-create-form.js';
import { TemplateImportForm } from './@components/template-import-form.js';
import { TEMPLATE_LIBRARIES, type TemplatesSearch, templatesSearchSchema } from './@interface/templates.interface.js';

// Office templates by area (AD-204): the four keys in order, then the own types alphabetically, then no area.
const AREA_KEYS: readonly string[] = TEMPLATE_AREAS;
const areaRank = (area?: string): number =>
  area === undefined ? AREA_KEYS.length + 1 : AREA_KEYS.includes(area) ? AREA_KEYS.indexOf(area) : AREA_KEYS.length;
const byArea = (templates: TemplateSummary[]): Array<[string | undefined, TemplateSummary[]]> =>
  [...new Set(templates.map((template) => template.area))]
    .sort((a, b) => areaRank(a) - areaRank(b) || (a ?? '').localeCompare(b ?? '', 'pt-BR'))
    .map((area) => [area, templates.filter((template) => template.area === area)]);

function TemplateList({ templates }: { templates: TemplateSummary[] }) {
  return (
    <LinkList>
      {templates.map((template) => (
        <LinkListItem
          key={template.id}
          icon={ListTree}
          render={<Link to="/expert-reports/templates/details" search={{ id: template.id }} />}
          title={template.name}
          badges={template.isDefault && <Badge variant="info">{t('standard')}</Badge>}
          description={[template.details, t(template.type), `${template.totalSections} ${t('sections').toLowerCase()}`]
            .filter(Boolean)
            .join(' · ')}
        />
      ))}
    </LinkList>
  );
}

// BIB-01 to BIB-04: standard library (read-only, "Usar no escritório" in the detail) and office library by area.
export function TemplatesPage() {
  const navigate = useNavigate({ from: '/expert-reports/templates/' });
  const search = useSearch({ from: '/_private/expert-reports/templates/' });
  const library = search.library ?? 'standard';
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery(templatesQuery());
  const [dialog, setDialog] = useState<'create' | 'import' | null>(null);
  const canCreate = can(session, 'report_templates', 'create');
  const templates = (query.data ?? []).filter((template) => template.isDefault === (library === 'standard'));
  const open = (template: { id: string }) =>
    navigate({ to: '/expert-reports/templates/details', search: { id: template.id } });

  return (
    <Card asPage>
      <CardHeader title={t('report_templates')} description={t('report_templates_description')}>
        {canCreate && library === 'office' && (
          <CardAction>
            <Button variant="outline" onClick={() => setDialog('import')}>
              {t('import_template')}
            </Button>
            <Button onClick={() => setDialog('create')}>{t('new_template')}</Button>
          </CardAction>
        )}
      </CardHeader>
      <Tabs
        value={library}
        onValueChange={(value) => navigate({ search: { library: value as TemplatesSearch['library'] }, replace: true })}
        className="px-(--card-spacing)"
      >
        <TabsList variant="line">
          {TEMPLATE_LIBRARIES.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(value === 'standard' ? 'standard_library' : 'office_library')}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <CardContent className="max-w-4xl gap-6">
        {query.isLoading ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
          />
        ) : library === 'standard' ? (
          <TemplateList templates={templates} />
        ) : !templates.length ? (
          <DefaultEmptyData title={t('no_office_templates_yet')} description={t('no_office_templates_hint')} />
        ) : (
          byArea(templates).map(([area, items]) => (
            <section key={area ?? ''} className="grid gap-3">
              <ItemTitle>{templateAreaLabel(area)}</ItemTitle>
              <TemplateList templates={items} />
            </section>
          ))
        )}
      </CardContent>
      {dialog === 'create' && <TemplateCreateForm onClose={() => setDialog(null)} onDone={open} />}
      {dialog === 'import' && <TemplateImportForm onClose={() => setDialog(null)} onDone={open} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/templates/')({
  component: TemplatesPage,
  validateSearch: (search: Record<string, unknown>): TemplatesSearch => templatesSearchSchema.parse(search),
  staticData: { title: t('report_templates') },
});
