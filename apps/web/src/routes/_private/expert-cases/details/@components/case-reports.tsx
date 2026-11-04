import { PDF_IMPORT_MAX_BYTES, reportRoleType } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { FilePlus, FileSignature, Paperclip } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { REPORT_STATUS_VARIANT, reportStatusLabel } from '@/components/report-labels.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseRecord } from '@/query/case.js';
import { attachReportMutation, type ReportRecord, reportsQuery, saveReportAsTemplateMutation } from '@/query/report.js';
import { can, sessionQuery } from '@/query/session.js';
import { SaveTemplateDialog } from '../../../expert-reports/@components/save-template-dialog.js';
import { AttachReportDialog } from './attach-report-dialog.js';

// Reports (or opinions, LAU-06) of the case: attach a PDF made outside the Ethica (ANL-02) or create one from
// a template; right after attaching, the expert may save it as a template (ANL-04).
export function CaseReports({ legalCase }: { legalCase: CaseRecord }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery(reportsQuery({ caseId: legalCase.id, limit: 20 }));
  const attach = useMutation(attachReportMutation(queryClient));
  const saveTemplate = useMutation(saveReportAsTemplateMutation(queryClient));
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [attached, setAttached] = useState<ReportRecord | null>(null);
  const opinion = reportRoleType(legalCase.role) === 'technical_opinion';
  const onError = (error: Error) => toast.error(error.message);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    if (!chosen.name.toLowerCase().endsWith('.pdf')) return void toast.error(t('unsupported_file_type'));
    if (chosen.size > PDF_IMPORT_MAX_BYTES) return void toast.error(t('file_too_large'));
    setFile(chosen);
  }

  function confirmAttach(recordDelivery: boolean) {
    if (!file) return;
    attach.mutate(
      { caseId: legalCase.id, file, recordDelivery },
      {
        onSuccess: (report) => {
          setFile(null);
          toast.success(t('report_attached_successfully'));
          if (can(session, 'report_templates', 'create')) setAttached(report);
        },
        onError,
      },
    );
  }

  return (
    <Panel
      collapsible
      icon={<FileSignature />}
      size="sm"
      title={t(opinion ? 'technical_opinions' : 'expert_reports')}
      actions={
        can(session, 'expert_reports', 'create') && (
          <>
            <Button variant="outline" disabled={attach.isPending} onClick={() => inputRef.current?.click()}>
              <Paperclip />
              {t('attach_pdf_or_import_report')}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link to="/expert-reports/add" search={{ caseId: legalCase.id }}>
                  <FilePlus />
                  {t('create_from_template')}
                </Link>
              }
            />
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label={t('attach_pdf_or_import_report')}
              onChange={handleFile}
            />
          </>
        )
      }
    >
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.items.length ? (
        <DefaultEmptyData title={t('no_reports_yet')} />
      ) : (
        <LinkList>
          {query.data.items.map((report) => (
            <LinkListItem
              key={report.id}
              icon={report.file ? Paperclip : FileSignature}
              render={<Link to="/expert-reports/details" search={{ id: report.id }} />}
              title={report.templateName}
              badges={<Badge variant={REPORT_STATUS_VARIANT[report.status]}>{reportStatusLabel(report.status)}</Badge>}
              description={`${t('updated_on')} ${formatDate(report.updatedAt)}`}
            />
          ))}
        </LinkList>
      )}
      {file && (
        <AttachReportDialog
          fileName={file.name}
          pending={attach.isPending}
          onConfirm={confirmAttach}
          onClose={() => setFile(null)}
        />
      )}
      {attached && (
        <SaveTemplateDialog
          attached
          name={attached.templateName}
          pending={saveTemplate.isPending}
          onClose={() => setAttached(null)}
          onConfirm={(data) =>
            saveTemplate.mutate(
              { id: attached.id, data },
              {
                onSuccess: (template) => {
                  setAttached(null);
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
    </Panel>
  );
}
