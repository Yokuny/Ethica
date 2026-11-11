import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { type ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';

// One report per page: its name, what the PDF brings and, below, how to generate it.
export function ReportPage({
  title,
  contents,
  children,
}: {
  title: string;
  contents: readonly string[];
  children: ReactNode;
}) {
  return (
    <Card asPage>
      <CardHeader title={t(title)} />
      <CardContent className="max-w-4xl gap-8">
        <div className="space-y-4">
          <ItemTitle
            // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
            render={<h2 />}
            className="font-semibold text-xl tracking-tight md:text-3xl"
          >
            {t(title)}
          </ItemTitle>
          <ul className="flex flex-col gap-1">
            {contents.map((key) => (
              <li key={key}>
                <ItemDescription className="line-clamp-none text-base md:text-lg">{t(key)}</ItemDescription>
              </li>
            ))}
          </ul>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

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
