import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useEffect, useState } from 'react';
import { DefaultLoading } from '@/components/default-loading.js';
import { FormDialog } from '@/components/form-dialog.js';
import { getFile } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';

type ReportPreviewDialogProps = {
  reportId: string;
  downloading: boolean;
  onDownload: (format: 'pdf' | 'docx') => void;
  onClose: () => void;
};

// LMO-04: the report PDF on screen before completing; variables without a value show as markers.
export function ReportPreviewDialog({ reportId, downloading, onDownload, onClose }: ReportPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    void getFile(`/expert-reports/${reportId}/pdf?preview=true`).then((res) => {
      if (!res.success) return setError(res.message);
      objectUrl = URL.createObjectURL(res.blob);
      setUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reportId]);

  return (
    <FormDialog size="lg" title={t('preview_pdf')} description={t('preview_pdf_description')} onClose={onClose}>
      {error ? (
        <ItemDescription role="alert" className="text-destructive line-clamp-none">
          {error}
        </ItemDescription>
      ) : url ? (
        <iframe title={t('preview_pdf')} src={url} className="h-[70dvh] w-full rounded-md border" />
      ) : (
        <DefaultLoading />
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={downloading} onClick={() => onDownload('docx')}>
          {t('export_word')}
        </Button>
        <Button type="button" disabled={downloading} onClick={() => onDownload('pdf')}>
          {t('export_pdf')}
        </Button>
      </div>
    </FormDialog>
  );
}
