import { PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@ethica/ui/components/dropdown-menu';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { FileSignature } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppLink } from '@/components/app-link.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { RecordHeader, RecordHeading, RecordStatus } from '@/components/record.js';
import { REPORT_STATUS_VARIANT, reportStatusLabel } from '@/components/report-labels.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseInspectionsQuery } from '@/query/inspection.js';
import {
  addReportSectionMutation,
  completeReportMutation,
  deleteReportMutation,
  fillReportFromProcessMutation,
  moveReportSectionMutation,
  type ProcessFill,
  removeReportSectionMutation,
  reportQuery,
  saveReportAsTemplateMutation,
  setReportLayoutMutation,
  updateReportSectionMutation,
  uploadReportPhotoMutation,
} from '@/query/report.js';
import { can, sessionQuery } from '@/query/session.js';
import { LayoutDialog } from '../@components/layout-dialog.js';
import { CompleteReportDialog } from './@components/complete-report-dialog.js';
import { ProcessFillDialog } from './@components/process-fill-dialog.js';
import { ReportPreviewDialog } from './@components/report-preview-dialog.js';
import { ReportSectionsDialog } from './@components/report-sections-dialog.js';
import { ReportSectionsList } from './@components/report-sections-list.js';
import { SaveTemplateDialog } from './@components/save-template-dialog.js';
import { SectionTitleDialog } from './@components/section-title-dialog.js';
import { type ReportDetailsSearch, reportDetailsSearchSchema } from './@interface/report-details.interface.js';

type Dialog =
  | { kind: 'complete' | 'removal' | 'sections' | 'preview' | 'layout' | 'save-template' }
  | { kind: 'rename-section' | 'remove-section'; sectionId: string }
  | { kind: 'add-section'; sectionId: string; level: number }
  | null;

export function ReportDetailsPage() {
  const search = useSearch({ strict: false }) as ReportDetailsSearch;
  const navigate = useNavigate({ from: '/expert-reports/details/' });
  const queryClient = useQueryClient();
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery({ ...reportQuery(search.id), retry: false });
  const save = useMutation(updateReportSectionMutation(queryClient));
  const addSection = useMutation(addReportSectionMutation(queryClient));
  const dropSection = useMutation(removeReportSectionMutation(queryClient));
  const move = useMutation(moveReportSectionMutation(queryClient));
  const setLayout = useMutation(setReportLayoutMutation(queryClient));
  const complete = useMutation(completeReportMutation(queryClient));
  const saveTemplate = useMutation(saveReportAsTemplateMutation(queryClient));
  const removal = useMutation(deleteReportMutation(queryClient));
  const uploadPhoto = useMutation(uploadReportPhotoMutation());
  const fillFromProcess = useMutation(fillReportFromProcessMutation(queryClient));
  const [processResult, setProcessResult] = useState<ProcessFill | null>(null);
  const processInputRef = useRef<HTMLInputElement>(null);
  const { download, pending } = useFileDownload();
  // Photos of the case inspections for the editor's "Inserir foto" (AD-129).
  const inspections = useQuery({ ...caseInspectionsQuery(query.data?.caseId ?? ''), enabled: Boolean(query.data) });
  const photos = (inspections.data ?? []).flatMap(({ appointment, inspection }) =>
    inspection.media
      .filter((media) => media.type === 'photo')
      .map((media) => ({ src: `/inspections/${appointment.id}/media/${media.id}`, caption: media.caption })),
  );
  // Text being edited by item (NLA-05): several items may be open at the same time.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [savingAll, setSavingAll] = useState(false);
  const report = query.data;
  const dirtyIds = Object.entries(drafts)
    .filter(([sectionId, draft]) => {
      const section = report?.sections.find((item) => item.id === sectionId);
      return section && draft !== section.html;
    })
    .map(([sectionId]) => sectionId);
  const busy = savingAll || save.isPending || addSection.isPending || dropSection.isPending || move.isPending;
  const onError = (error: Error) => toast.error(error.message);

  const forget = (sectionId: string) =>
    setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== sectionId)));

  function saveSection(sectionId: string) {
    const html = drafts[sectionId];
    if (!report || html === undefined) return;
    save.mutate({ id: report.id, sectionId, data: { html } }, { onSuccess: () => forget(sectionId), onError });
  }

  // Before leaving the editor (preview, export, template, process), every changed item is saved, so no text is lost.
  async function saveAll(then?: () => void) {
    if (!report) return;
    setSavingAll(true);
    try {
      for (const sectionId of dirtyIds) {
        await save.mutateAsync({ id: report.id, sectionId, data: { html: drafts[sectionId] } });
      }
      setDrafts({});
      then?.();
    } catch (error) {
      onError(error as Error);
    } finally {
      setSavingAll(false);
    }
  }

  function toggleIncluded(sectionId: string, included: boolean) {
    if (!report) return;
    save.mutate({ id: report.id, sectionId, data: { included } }, { onError });
  }

  // LMO-03: the full process PDF fills questions and claims; the dialog shows what was found.
  function handleProcessFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !report) return;
    if (file.size > PDF_IMPORT_MAX_BYTES) return void toast.error(t('file_too_large'));
    void saveAll(() =>
      fillFromProcess.mutate({ id: report.id, file }, { onSuccess: (result) => setProcessResult(result), onError }),
    );
  }

  function runExport(format: 'pdf' | 'docx') {
    if (!report) return;
    void saveAll(() => void download(`/expert-reports/${report.id}/${format}`));
  }

  const openDraft = report?.status === 'draft';
  const target =
    dialog && 'sectionId' in dialog ? report?.sections.find((item) => item.id === dialog.sectionId) : undefined;
  // Secondary actions in the "…" (the expert asked for a cleaner header): only preview and complete stay outside.
  const menu = report && (
    <PageMenu>
      {openDraft && (
        <>
          <DropdownMenuItem
            disabled={fillFromProcess.isPending || busy}
            onClick={() => processInputRef.current?.click()}
          >
            {fillFromProcess.isPending ? t('reading_pdf') : t('fill_from_process')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={busy} onClick={() => void saveAll(() => setDialog({ kind: 'sections' }))}>
            {t('template_sections')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog({ kind: 'layout' })}>{t('report_layout')}</DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      {can(session, 'report_templates', 'create') && (
        <>
          <DropdownMenuItem disabled={busy} onClick={() => void saveAll(() => setDialog({ kind: 'save-template' }))}>
            {t('save_as_template')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem disabled={Boolean(pending)} onClick={() => runExport('pdf')}>
        {t('export_pdf')}
      </DropdownMenuItem>
      <DropdownMenuItem disabled={Boolean(pending)} onClick={() => runExport('docx')}>
        {t('export_word')}
      </DropdownMenuItem>
    </PageMenu>
  );

  return (
    <Card asPage>
      <CardHeader title={t('details')}>
        {report && (
          <CardAction>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void saveAll(() => setDialog({ kind: 'preview' }))}
            >
              {t('preview_pdf')}
            </Button>
            <input
              ref={processInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label={t('fill_from_process')}
              onChange={handleProcessFile}
            />
            {openDraft && (
              <Button
                disabled={report.issues.length > 0 || dirtyIds.length > 0 || busy}
                title={report.issues.length ? t('fill_or_remove_variables') : undefined}
                onClick={() => setDialog({ kind: 'complete' })}
              >
                {t('complete')}
              </Button>
            )}
            {menu}
          </CardAction>
        )}
      </CardHeader>
      {query.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !report ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <CardContent className="gap-8">
          <RecordHeader>
            <RecordHeading
              icon={<FileSignature />}
              label={`${t(report.type)} · ${report.templateName}`}
              title={report.caseNumber ?? t('expert_case_removed')}
              description={
                <AppLink to="/expert-cases/details" search={{ id: report.caseId }} as="description">
                  {t('open_expert_case')}
                </AppLink>
              }
            />
            <RecordStatus
              variant={REPORT_STATUS_VARIANT[report.status]}
              label={reportStatusLabel(report.status)}
              pulse={report.status === 'draft'}
            />
          </RecordHeader>
          <ReportSectionsList
            report={report}
            drafts={drafts}
            saving={busy}
            onChange={(sectionId, html) => setDrafts((prev) => ({ ...prev, [sectionId]: html }))}
            onSave={saveSection}
            onToggleIncluded={toggleIncluded}
            onMove={(sectionId, direction) => move.mutate({ id: report.id, sectionId, direction }, { onError })}
            onRename={(sectionId) => setDialog({ kind: 'rename-section', sectionId })}
            onAdd={(sectionId, level) => setDialog({ kind: 'add-section', sectionId, level })}
            onRemove={(sectionId) => setDialog({ kind: 'remove-section', sectionId })}
            photos={photos}
            uploadPhoto={(photo) => uploadPhoto.mutateAsync({ id: report.id, photo })}
          />
        </CardContent>
      )}
      {report && openDraft && (
        <CardFooter className="justify-between gap-2">
          <Button variant="destructive" onClick={() => setDialog({ kind: 'removal' })}>
            {t('remove')}
          </Button>
        </CardFooter>
      )}
      {report && processResult && (
        <ProcessFillDialog caseId={report.caseId} result={processResult} onClose={() => setProcessResult(null)} />
      )}
      {report && dialog?.kind === 'preview' && (
        <ReportPreviewDialog
          reportId={report.id}
          downloading={Boolean(pending)}
          onDownload={runExport}
          onClose={() => setDialog(null)}
        />
      )}
      {report && dialog?.kind === 'sections' && (
        <ReportSectionsDialog report={report} onClose={() => setDialog(null)} />
      )}
      {report && dialog?.kind === 'layout' && (
        <LayoutDialog
          layout={report.layout}
          pending={setLayout.isPending}
          onClose={() => setDialog(null)}
          onSave={(layout) =>
            setLayout.mutate(
              { id: report.id, layout },
              {
                onSuccess: () => {
                  setDialog(null);
                  toast.success(t('changes_saved'));
                },
                onError,
              },
            )
          }
        />
      )}
      {report && dialog?.kind === 'save-template' && (
        <SaveTemplateDialog
          name={report.templateName}
          pending={saveTemplate.isPending}
          onClose={() => setDialog(null)}
          onConfirm={(data) =>
            saveTemplate.mutate(
              { id: report.id, data },
              {
                onSuccess: (template) => {
                  setDialog(null);
                  toast.success(t('saved_successfully'), {
                    action: {
                      label: t('view'),
                      onClick: () => navigate({ to: '/expert-reports/templates/details', search: { id: template.id } }),
                    },
                  });
                },
                onError,
              },
            )
          }
        />
      )}
      {report && target && dialog?.kind === 'add-section' && (
        <SectionTitleDialog
          heading={dialog.level > target.level ? t('add_sub_item') : t('add_item')}
          pending={addSection.isPending}
          onClose={() => setDialog(null)}
          onConfirm={(title) =>
            addSection.mutate(
              { id: report.id, data: { title, level: dialog.level, afterId: target.id } },
              { onSuccess: () => setDialog(null), onError },
            )
          }
        />
      )}
      {report && target && dialog?.kind === 'rename-section' && (
        <SectionTitleDialog
          heading={t('edit_title')}
          title={target.title}
          pending={save.isPending}
          onClose={() => setDialog(null)}
          onConfirm={(title) =>
            save.mutate(
              { id: report.id, sectionId: target.id, data: { title } },
              { onSuccess: () => setDialog(null), onError },
            )
          }
        />
      )}
      {report && dialog?.kind === 'complete' && (
        <CompleteReportDialog
          pending={complete.isPending}
          onClose={() => setDialog(null)}
          onConfirm={(recordDelivery) =>
            complete.mutate(
              { id: report.id, data: { recordDelivery } },
              {
                onSuccess: () => {
                  setDialog(null);
                  toast.success(t('report_completed_successfully'));
                },
                onError,
              },
            )
          }
        />
      )}
      {report && target && dialog?.kind === 'remove-section' && (
        <ConfirmDialog
          title={t('remove_section_question')}
          description={target.title}
          confirmLabel={t('remove')}
          pending={dropSection.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            dropSection.mutate(
              { id: report.id, sectionId: target.id },
              {
                onSuccess: () => {
                  setDialog(null);
                  forget(target.id);
                },
                onError,
              },
            )
          }
        />
      )}
      {report && dialog?.kind === 'removal' && (
        <ConfirmDialog
          title={t('remove_report_question')}
          description={t('action_cannot_be_undone')}
          confirmLabel={t('remove')}
          pending={removal.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            removal.mutate({ id: report.id }, { onSuccess: () => navigate({ to: '/expert-reports/list' }), onError })
          }
        />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/details/')({
  component: ReportDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): ReportDetailsSearch => reportDetailsSearchSchema.parse(search),
});
