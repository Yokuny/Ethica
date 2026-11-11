import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { DateField } from '@/components/form-fields.js';
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useFinanceReportForm } from '../@hooks/use-finance-report-form.js';

export function FinanceReportForm() {
  const { form, onSubmit, onPreview, previewPath, closePreview, download, isPending } = useFinanceReportForm();
  const { control } = form;
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <DateField control={control} name="from" label={t('from_date')} placeholder={t('choose_day')} />
        <DateField control={control} name="to" label={t('to_date')} placeholder={t('choose_day')} />
        <Button type="button" variant="outline" size="field" onClick={onPreview}>
          {t('preview_pdf')}
        </Button>
        <Button type="submit" size="field" disabled={isPending}>
          {t('generate_pdf')}
        </Button>
      </form>
      {previewPath && (
        <PdfPreviewDialog path={previewPath} onClose={closePreview}>
          <Button disabled={isPending} onClick={() => download(previewPath)}>
            {t('generate_pdf')}
          </Button>
        </PdfPreviewDialog>
      )}
    </Form>
  );
}
