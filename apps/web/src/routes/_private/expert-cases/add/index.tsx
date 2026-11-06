import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { FileUp } from 'lucide-react';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { CaseAttachmentsField } from '../@components/case-attachments-field.js';
import { CaseFormFields } from '../@components/case-form-fields.js';
import { PdfFillDialog } from './@components/pdf-fill-dialog.js';
import { useCaseForm } from './@hooks/use-case-form.js';
import { usePdfFill } from './@hooks/use-pdf-fill.js';

export function CaseAddPage() {
  const { form, onSubmit, isPending, errorMessage, attachments } = useCaseForm();
  const pdf = usePdfFill(form);
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
              <Button type="button" variant="outline" onClick={pdf.start}>
                <FileUp />
                {t('fill_from_pdf')}
              </Button>
              {formActions}
            </CardAction>
          </CardHeader>
          <CardContent>
            {pdf.filled && (
              <ItemDescription role="status" className="line-clamp-none">
                {t('pdf_filled_review_before_saving')}
              </ItemDescription>
            )}
            <CaseFormFields
              control={form.control}
              attachments={<CaseAttachmentsField key="attachments" form={attachments} />}
            />
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
      {pdf.open && <PdfFillDialog pdf={pdf} />}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-cases/add/')({
  component: CaseAddPage,
  staticData: { title: t('new_expert_case') },
});
