import { ItemDescription } from '@ethica/ui/components/item';
import { type ReactNode, useEffect, useState } from 'react';
import { DefaultLoading } from '@/components/default-loading.js';
import { FormDialog } from '@/components/form-dialog.js';
import { getFile } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';

type PdfPreviewDialogProps = {
  path: string;
  description?: string;
  onClose: () => void;
  // The download buttons, below the document.
  children: ReactNode;
};

// A PDF of the API on screen before downloading it (LMO-04, reports).
export function PdfPreviewDialog({ path, description, onClose, children }: PdfPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    void getFile(path).then((res) => {
      if (!res.success) return setError(res.message);
      objectUrl = URL.createObjectURL(res.blob);
      setUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return (
    <FormDialog size="lg" title={t('preview_pdf')} description={description} onClose={onClose}>
      {error ? (
        <ItemDescription role="alert" className="text-destructive line-clamp-none">
          {error}
        </ItemDescription>
      ) : url ? (
        <iframe title={t('preview_pdf')} src={url} className="h-[70dvh] w-full rounded-md border" />
      ) : (
        <DefaultLoading />
      )}
      <div className="flex flex-wrap justify-end gap-2">{children}</div>
    </FormDialog>
  );
}
