import { Button } from '@ethica/ui/components/button';
import { useState } from 'react';
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Preview and download of a report without filters; two equal buttons on the phone.
export function PdfActions({ path }: { path: string }) {
  const { download, pending } = useFileDownload();
  const [previewing, setPreviewing] = useState(false);
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Button variant="outline" onClick={() => setPreviewing(true)}>
        {t('preview_pdf')}
      </Button>
      <Button disabled={pending === path} onClick={() => download(path)}>
        {t('generate_pdf')}
      </Button>
      {previewing && (
        <PdfPreviewDialog path={path} onClose={() => setPreviewing(false)}>
          <Button disabled={pending === path} onClick={() => download(path)}>
            {t('generate_pdf')}
          </Button>
        </PdfPreviewDialog>
      )}
    </div>
  );
}
