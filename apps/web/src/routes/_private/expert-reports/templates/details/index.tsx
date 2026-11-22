import { numberSections, sectionTitle } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Ellipsis, ListTree } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { NumberedList } from '@/components/numbered-list.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { plainText, templateAreaItems, templateAreaLabel } from '@/components/report-labels.js';
import { RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import {
  deleteTemplateMutation,
  moveTemplateSectionMutation,
  removeTemplateSectionMutation,
  setTemplateLayoutMutation,
  type TemplateSectionRecord,
  templateQuery,
  updateTemplateMutation,
} from '@/query/report.js';
import { can, sessionQuery } from '@/query/session.js';
import { LayoutDialog } from '../../@components/layout-dialog.js';
import { SaveTemplateDialog } from '../../@components/save-template-dialog.js';
import { TemplateCreateForm } from '../@components/template-create-form.js';
import { TemplateSectionForm } from './@components/template-section-form.js';
import { type TemplateDetailsSearch, templateDetailsSearchSchema } from './@interface/template-details.interface.js';

type PanelState =
  | { kind: 'section'; section?: TemplateSectionRecord }
  | { kind: 'remove-section'; section: TemplateSectionRecord }
  | { kind: 'duplicate' }
  | { kind: 'edit' }
  | { kind: 'layout' }
  | { kind: 'pdf' }
  | { kind: 'removal' }
  | null;

// LAU-01.2: sections numbered by position and level, in the same list as the report; the default is read-only
// and gets duplicated.
export function TemplateDetailsPage() {
  const search = useSearch({ strict: false }) as TemplateDetailsSearch;
  const navigate = useNavigate({ from: '/expert-reports/templates/details/' });
  const queryClient = useQueryClient();
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery({ ...templateQuery(search.id), retry: false });
  const move = useMutation(moveTemplateSectionMutation(queryClient));
  const dropSection = useMutation(removeTemplateSectionMutation(queryClient));
  const removal = useMutation(deleteTemplateMutation(queryClient));
  const setLayout = useMutation(setTemplateLayoutMutation(queryClient));
  const update = useMutation(updateTemplateMutation(queryClient));
  const [panel, setPanel] = useState<PanelState>(null);
  const template = query.data;
  const serviceTypes = useQuery(serviceTypesQuery);
  const canEdit = Boolean(template && !template.isDefault && can(session, 'report_templates', 'update'));
  const numbers = numberSections(template?.sections ?? []);
  const onError = (error: Error) => toast.error(error.message);

  return (
    <Card asPage>
      <CardHeader title={t('details')}>
        {template && (
          <CardAction>
            <Button variant="outline" onClick={() => setPanel({ kind: 'pdf' })}>
              {t('preview_pdf')}
            </Button>
            {template.isDefault && can(session, 'report_templates', 'create') && (
              <Button onClick={() => setPanel({ kind: 'duplicate' })}>{t('use_in_office')}</Button>
            )}
            {canEdit && <Button onClick={() => setPanel({ kind: 'section' })}>{t('new_section')}</Button>}
            {canEdit && (
              // Secondary actions in the "…", like the report (only preview and the main action stay outside).
              <PageMenu>
                <DropdownMenuItem onClick={() => setPanel({ kind: 'edit' })}>
                  {t('edit_name_and_details')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPanel({ kind: 'layout' })}>{t('report_layout')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPanel({ kind: 'duplicate' })}>
                  {t('duplicate_template')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setPanel({ kind: 'removal' })}>
                  {t('remove')}
                </DropdownMenuItem>
              </PageMenu>
            )}
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
        <CardContent className="gap-8">
          <RecordHeader>
            <RecordHeading
              icon={<ListTree />}
              label={t(template.type)}
              title={template.name}
              badge={template.isDefault && <Badge variant="info">{t('standard')}</Badge>}
              description={
                template.isDefault
                  ? t('standard_template_review_notice')
                  : [templateAreaLabel(template.area), template.details].filter(Boolean).join(' · ')
              }
            />
          </RecordHeader>
          {!template.sections.length ? (
            <DefaultEmptyData title={t('no_sections_yet')} />
          ) : (
            // Same list as the report (NLA-05): numbered rows, the texts open below the title.
            <NumberedList
              actionsLabel={`${template.sections.length} ${t('sections').toLowerCase()}`}
              items={template.sections.map((section, i) => ({
                id: section.id,
                number: numbers[i],
                level: section.level,
                title: sectionTitle(section.title, section.level),
                summary: [
                  section.titleOnly && t('title_only'),
                  section.unnumbered && t('without_number'),
                  section.pageBreak && t('page_break_before'),
                  plainText(section.yesText),
                ]
                  .filter(Boolean)
                  .join(' · '),
                actions: canEdit ? (
                  <>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button size="icon-sm" variant="ghost" aria-label={t('more_actions')} />}
                      >
                        <Ellipsis />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPanel({ kind: 'section', section })}>
                          {t('edit_section')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setPanel({ kind: 'remove-section', section })}
                        >
                          {t('remove_section')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : undefined,
                children: section.titleOnly ? undefined : (
                  <div className="grid gap-4">
                    <ItemTitle>{t('yes_text')}</ItemTitle>
                    <RichTextEditor value={section.yesText} readOnly label={t('yes_text')} />
                    <ItemTitle>{t('no_text')}</ItemTitle>
                    <RichTextEditor value={section.noText} readOnly label={t('no_text')} />
                  </div>
                ),
              }))}
            />
          )}
        </CardContent>
      )}
      {template && panel?.kind === 'section' && (
        <TemplateSectionForm templateId={template.id} section={panel.section} onClose={() => setPanel(null)} />
      )}
      {template && panel?.kind === 'layout' && (
        <LayoutDialog
          layout={template.layout}
          pending={setLayout.isPending}
          onClose={() => setPanel(null)}
          onSave={(layout) =>
            setLayout.mutate(
              { id: template.id, layout },
              {
                onSuccess: () => {
                  setPanel(null);
                  toast.success(t('changes_saved'));
                },
                onError,
              },
            )
          }
        />
      )}
      {template && panel?.kind === 'edit' && (
        <SaveTemplateDialog
          title={t('edit_name_and_details')}
          values={{ name: template.name, details: template.details, area: template.area }}
          areas={templateAreaItems(serviceTypes.data ?? [])}
          pending={update.isPending}
          onClose={() => setPanel(null)}
          onConfirm={(data) => update.mutate({ id: template.id, data }, { onSuccess: () => setPanel(null), onError })}
        />
      )}
      {template && panel?.kind === 'pdf' && (
        <PdfPreviewDialog
          path={`/expert-reports/templates/${encodeURIComponent(template.id)}/pdf`}
          description={t('template_pdf_description')}
          onClose={() => setPanel(null)}
        />
      )}
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
