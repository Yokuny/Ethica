import { Button } from '@ethica/ui/components/button';
import { DropdownMenuItem } from '@ethica/ui/components/dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { FileSignature } from 'lucide-react';
import { useState } from 'react';
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
  completeReportMutation,
  deleteReportMutation,
  removeReportSectionMutation,
  reportQuery,
  updateReportSectionMutation,
} from '@/query/report.js';
import { CompleteReportDialog } from './@components/complete-report-dialog.js';
import { ReportSectionEditor, type SectionDraft } from './@components/report-section-editor.js';
import { ReportSectionsDialog } from './@components/report-sections-dialog.js';
import { ReportSectionsNav } from './@components/report-sections-nav.js';
import { type ReportDetailsSearch, reportDetailsSearchSchema } from './@interface/report-details.interface.js';

type Dialog = 'complete' | 'removal' | 'remove-section' | 'sections' | null;

export function ReportDetailsPage() {
  const search = useSearch({ strict: false }) as ReportDetailsSearch;
  const navigate = useNavigate({ from: '/expert-reports/details/' });
  const queryClient = useQueryClient();
  const query = useQuery({ ...reportQuery(search.id), retry: false });
  const save = useMutation(updateReportSectionMutation(queryClient));
  const dropSection = useMutation(removeReportSectionMutation(queryClient));
  const complete = useMutation(completeReportMutation(queryClient));
  const removal = useMutation(deleteReportMutation(queryClient));
  const { download, pending } = useFileDownload();
  // Photos of the case inspections for the editor's "Inserir foto" (AD-129).
  const inspections = useQuery({ ...caseInspectionsQuery(query.data?.caseId ?? ''), enabled: Boolean(query.data) });
  const photos = (inspections.data ?? []).flatMap(({ appointment, inspection }) =>
    inspection.media
      .filter((media) => media.type === 'photo')
      .map((media) => ({ src: `/inspections/${appointment.id}/media/${media.id}`, caption: media.caption })),
  );
  const [draft, setDraft] = useState<(SectionDraft & { sectionId: string }) | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const report = query.data;
  const section = report?.sections.find((item) => item.id === search.section) ?? report?.sections[0];
  const current =
    section && draft?.sectionId === section.id
      ? draft
      : section && { sectionId: section.id, title: section.title, html: section.html };
  const dirty = Boolean(section && current && (current.title !== section.title || current.html !== section.html));
  const onError = (error: Error) => toast.error(error.message);

  function saveCurrent(depois?: () => void) {
    if (!report || !section || !current || !dirty) return depois?.();
    save.mutate(
      { id: report.id, sectionId: section.id, data: { title: current.title, html: current.html } },
      {
        onSuccess: () => {
          setDraft(null);
          depois?.();
        },
        onError,
      },
    );
  }

  // Switching sections first saves the one that was open, so no text is lost.
  function selecionar(sectionId: string) {
    saveCurrent(() =>
      navigate({ search: (prev: ReportDetailsSearch) => ({ ...prev, section: sectionId }), replace: true }),
    );
  }

  function runExport(format: 'pdf' | 'docx') {
    if (!report) return;
    saveCurrent(() => void download(`/expert-reports/${report.id}/${format}`));
  }

  const openDraft = report?.status === 'draft';
  const menu = report && (
    <PageMenu>
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
            {openDraft && (
              <Button variant="outline" onClick={() => saveCurrent(() => setDialog('sections'))}>
                {t('template_sections')}
              </Button>
            )}
            {openDraft && (
              <Button
                disabled={report.issues.length > 0 || dirty}
                title={report.issues.length ? t('fill_or_remove_variables') : undefined}
                onClick={() => setDialog('complete')}
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
      ) : !report || !section || !current ? (
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
          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <ReportSectionsNav report={report} selected={section.id} onSelect={selecionar} />
            <ReportSectionEditor
              report={report}
              section={section}
              draft={current}
              onChange={(next) => setDraft({ ...next, sectionId: section.id })}
              dirty={dirty}
              saving={save.isPending || dropSection.isPending}
              onSave={() => saveCurrent()}
              onRemove={() => setDialog('remove-section')}
              photos={photos}
            />
          </div>
        </CardContent>
      )}
      {report && openDraft && (
        <CardFooter className="justify-between gap-2">
          <Button variant="destructive" onClick={() => setDialog('removal')}>
            {t('remove')}
          </Button>
        </CardFooter>
      )}
      {report && dialog === 'sections' && (
        <ReportSectionsDialog
          report={report}
          onClose={() => {
            setDialog(null);
            navigate({ search: (prev: ReportDetailsSearch) => ({ ...prev, section: undefined }), replace: true });
          }}
        />
      )}
      {report && dialog === 'complete' && (
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
      {report && section && dialog === 'remove-section' && (
        <ConfirmDialog
          title={t('remove_section_question')}
          description={section.title}
          confirmLabel={t('remove')}
          pending={dropSection.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            dropSection.mutate(
              { id: report.id, sectionId: section.id },
              {
                onSuccess: () => {
                  setDialog(null);
                  setDraft(null);
                  navigate({ search: (prev: ReportDetailsSearch) => ({ ...prev, section: undefined }), replace: true });
                },
                onError,
              },
            )
          }
        />
      )}
      {report && dialog === 'removal' && (
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
