import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { FileUp } from 'lucide-react';
import { useRef } from 'react';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PericiaFormFields } from '../@components/pericia-form-fields.js';
import { PdfImportNotice } from './@components/pdf-import-notice.js';
import { usePdfImport } from './@hooks/use-pdf-import.js';
import { usePericiaForm } from './@hooks/use-pericia-form.js';

export function PericiaAddPage() {
  const { form, onSubmit, isPending, errorMessage } = usePericiaForm();
  const pdf = usePdfImport(form);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const formActions = (
    <Button type="submit" disabled={isPending}>
      {t('save')}
    </Button>
  );

  return (
    <Card asPage>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="contents">
          <CardHeader title={t('new_expert_case')}>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                disabled={pdf.isPending}
                onClick={() => pdfInputRef.current?.click()}
              >
                <FileUp />
                {pdf.isPending ? t('reading_pdf') : t('fill_from_pdf')}
              </Button>
              {formActions}
            </CardAction>
          </CardHeader>
          <CardContent>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label={t('fill_from_pdf')}
              onChange={pdf.handleFile}
            />
            {pdf.fileError && (
              <ItemDescription role="alert" className="text-destructive line-clamp-none">
                {pdf.fileError}
              </ItemDescription>
            )}
            {pdf.extraction && <PdfImportNotice extraction={pdf.extraction} />}
            <PericiaFormFields control={form.control} />
            {errorMessage && (
              <ItemDescription role="alert" className="text-destructive line-clamp-none">
                {errorMessage}
              </ItemDescription>
            )}
          </CardContent>
          <CardFooter>
            <CardAction>{formActions}</CardAction>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export const Route = createFileRoute('/_private/pericias/add/')({
  component: PericiaAddPage,
  staticData: { title: t('new_expert_case') },
});
