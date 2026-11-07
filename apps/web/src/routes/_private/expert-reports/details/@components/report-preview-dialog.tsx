import { Button } from '@ethica/ui/components/button';
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';

type ReportPreviewDialogProps = {
  reportId: string;
  // Attached report (ANL-02): the PDF that was sent, without Word.
  attached?: boolean;
  downloading: boolean;
  onDownload: (format: 'pdf' | 'docx') => void;
  onClose: () => void;
};

// LMO-04: the report PDF on screen before completing; variables without a value show as markers.
export function ReportPreviewDialog({
  reportId,
  attached,
  downloading,
  onDownload,
  onClose,
}: ReportPreviewDialogProps) {
  return (
    <PdfPreviewDialog
      path={`/expert-reports/${reportId}/pdf?preview=true`}
      description={attached ? undefined : t('preview_pdf_description')}
      onClose={onClose}
    >
      {!attached && (
        <Button type="button" variant="outline" disabled={downloading} onClick={() => onDownload('docx')}>
          {t('export_word')}
        </Button>
      )}
      <Button type="button" disabled={downloading} onClick={() => onDownload('pdf')}>
        {t('export_pdf')}
      </Button>
    </PdfPreviewDialog>
  );
}
