import { numberSections } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { DropdownMenuItem } from '@ethica/ui/components/dropdown-menu';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, ListTree, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { Panel } from '@/components/panel.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';
import {
  deleteTemplateMutation,
  moveTemplateSectionMutation,
  removeTemplateSectionMutation,
  type TemplateSectionRecord,
  templateQuery,
} from '@/query/report.js';
import { can, sessionQuery } from '@/query/session.js';
import { TemplateCreateForm } from '../@components/template-create-form.js';
import { TemplateSectionForm } from './@components/template-section-form.js';
import { TemplateSectionView } from './@components/template-section-view.js';
import { type TemplateDetailsSearch, templateDetailsSearchSchema } from './@interface/template-details.interface.js';

type PanelState =
  | { kind: 'section'; section?: TemplateSectionRecord }
  | { kind: 'ver'; section: TemplateSectionRecord }
  | { kind: 'remove-section'; section: TemplateSectionRecord }
  | { kind: 'duplicate' }
  | { kind: 'removal' }
  | null;

// LAU-01.2: sections numbered by position and level; the default is read-only and gets duplicated.
export function TemplateDetailsPage() {
  const search = useSearch({ strict: false }) as TemplateDetailsSearch;
  const navigate = useNavigate({ from: '/expert-reports/templates/details/' });
  const queryClient = useQueryClient();
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery({ ...templateQuery(search.id), retry: false });
  const move = useMutation(moveTemplateSectionMutation(queryClient));
  const dropSection = useMutation(removeTemplateSectionMutation(queryClient));
  const removal = useMutation(deleteTemplateMutation(queryClient));
  const [panel, setPanel] = useState<PanelState>(null);
  const template = query.data;
  const canEdit = Boolean(template && !template.isDefault && can(session, 'report_templates', 'update'));
  const numbers = numberSections(template?.sections ?? []);
  const onError = (error: Error) => toast.error(error.message);

  return (
    <Card asPage>
      <CardHeader title={t('details')}>
        {template && can(session, 'report_templates', 'update') && (
          <CardAction>
            {canEdit && <Button onClick={() => setPanel({ kind: 'section' })}>{t('new_section')}</Button>}
            <PageMenu>
              <DropdownMenuItem onClick={() => setPanel({ kind: 'duplicate' })}>
                {t('duplicate_template')}
              </DropdownMenuItem>
            </PageMenu>
          </CardAction>
        )}
      </CardHeader>
      {query.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !template ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <CardContent className="max-w-4xl gap-8">
          <RecordHeader>
            <RecordHeading
              icon={<ListTree />}
              label={t(template.type)}
              title={template.name}
              badge={template.isDefault && <Badge variant="info">{t('standard')}</Badge>}
              description={template.isDefault ? t('standard_template_review_notice') : undefined}
            />
          </RecordHeader>
          <Panel title={t('sections')} description={`${template.sections.length} ${t('sections').toLowerCase()}`}>
            {!template.sections.length ? (
              <DefaultEmptyData title={t('no_sections_yet')} />
            ) : (
              <LinkList>
                {template.sections.map((section, i) => (
                  <LinkListItem
                    key={section.id}
                    render={
                      canEdit ? undefined : (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setPanel({ kind: 'ver', section })}
                        />
                      )
                    }
                    className={section.level > 1 ? (section.level > 2 ? 'pl-14' : 'pl-9') : undefined}
                    title={`${numbers[i]}. ${section.title}`}
                    description={[section.titleOnly && t('title_only'), section.pageBreak && t('page_break_before')]
                      .filter(Boolean)
                      .join(' · ')}
                  >
                    {canEdit && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('move_up')}
                          disabled={i === 0 || move.isPending}
                          onClick={() =>
                            move.mutate({ id: template.id, sectionId: section.id, direction: 'up' }, { onError })
                          }
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('move_down')}
                          disabled={i === template.sections.length - 1 || move.isPending}
                          onClick={() =>
                            move.mutate({ id: template.id, sectionId: section.id, direction: 'down' }, { onError })
                          }
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('edit')}
                          onClick={() => setPanel({ kind: 'section', section })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('remove')}
                          onClick={() => setPanel({ kind: 'remove-section', section })}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </LinkListItem>
                ))}
              </LinkList>
            )}
          </Panel>
        </CardContent>
      )}
      {template && canEdit && (
        <CardFooter className="justify-between gap-2">
          <Button variant="destructive" onClick={() => setPanel({ kind: 'removal' })}>
            {t('remove')}
          </Button>
        </CardFooter>
      )}
      {template && panel?.kind === 'section' && (
        <TemplateSectionForm templateId={template.id} section={panel.section} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'ver' && <TemplateSectionView section={panel.section} onClose={() => setPanel(null)} />}
      {template && panel?.kind === 'duplicate' && (
        <TemplateCreateForm
          base={template}
          onClose={() => setPanel(null)}
          onDone={(fresh) => {
            setPanel(null);
            navigate({ search: { id: fresh.id } });
          }}
        />
      )}
      {template && panel?.kind === 'remove-section' && (
        <ConfirmDialog
          title={t('remove_section_question')}
          description={panel.section.title}
          confirmLabel={t('remove')}
          pending={dropSection.isPending}
          onClose={() => setPanel(null)}
          onConfirm={() =>
            dropSection.mutate(
              { id: template.id, sectionId: panel.section.id },
              { onSuccess: () => setPanel(null), onError },
            )
          }
        />
      )}
      {template && panel?.kind === 'removal' && (
        <ConfirmDialog
          title={t('remove_template_question')}
          description={t('remove_template_description')}
          confirmLabel={t('remove')}
          pending={removal.isPending}
          onClose={() => setPanel(null)}
          onConfirm={() =>
            removal.mutate(
              { id: template.id },
              { onSuccess: () => navigate({ to: '/expert-reports/templates' }), onError },
            )
          }
        />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/templates/details/')({
  component: TemplateDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): TemplateDetailsSearch => templateDetailsSearchSchema.parse(search),
});
