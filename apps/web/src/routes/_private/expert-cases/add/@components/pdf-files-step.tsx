import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { CircleAlert, FileText, Loader2, Upload, X } from 'lucide-react';
import { type DragEvent, useRef } from 'react';
import { AppLink } from '@/components/app-link.js';
import { Progress } from '@/components/progress.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PDF_MAX_SIZE_TEXT } from '../@consts/pdf-max-size.js';
import type { PdfFill } from '../@hooks/use-pdf-fill.js';

// Step 1 (AD-183): drop or choose several PDFs; each one shows how its reading went (file-upload-06 look).
export function PdfFilesStep({ pdf }: { pdf: PdfFill }) {
  const inputRef = useRef<HTMLInputElement>(null);
  function onDrop(event: DragEvent) {
    event.preventDefault();
    pdf.addFiles(event.dataTransfer.files);
  }

  return (
    <div className="grid gap-4">
      <button
        type="button"
        className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/50"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <ItemTitle className="items-center gap-2 text-muted-foreground">
          <Upload className="size-5" />
          {t('drop_pdfs_or_choose')}
        </ItemTitle>
        <ItemDescription className="line-clamp-none">
          {t('pdf_with_text')} · {PDF_MAX_SIZE_TEXT}
        </ItemDescription>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-label={t('fill_from_pdf')}
        onChange={(event) => {
          pdf.addFiles(event.target.files);
          event.target.value = '';
        }}
      />
      {pdf.files.length > 0 && (
        <ul className="divide-y">
          {pdf.files.map((file) => (
            <li key={file.id} className="flex items-start gap-3 py-3">
              <span className="grid size-10 shrink-0 place-content-center rounded border bg-muted">
                {file.status === 'reading' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : file.status === 'error' ? (
                  <CircleAlert className="size-4 text-destructive" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <ItemTitle className="min-w-0 break-all">{file.name}</ItemTitle>
                  <ItemDescription className="shrink-0">
                    {file.status === 'reading' ? t('reading_pdf') : file.status === 'read' ? t('done') : ''}
                  </ItemDescription>
                </div>
                {file.status === 'error' ? (
                  <ItemDescription role="alert" className="text-destructive line-clamp-none">
                    {file.error}
                  </ItemDescription>
                ) : (
                  <Progress value={file.status === 'read' ? 1 : undefined} max={1} aria-label={file.name} />
                )}
                {file.extraction?.warnings.map((warning) => (
                  <ItemDescription key={warning} className="line-clamp-none">
                    {t(warning)}
                  </ItemDescription>
                ))}
                {file.extraction?.existingId && (
                  <AppLink to="/expert-cases/details" search={{ id: file.extraction.existingId }} as="description">
                    {t('open_registered_expert_case')}
                  </AppLink>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${t('remove')} ${file.name}`}
                onClick={() => pdf.removeFile(file.id)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
