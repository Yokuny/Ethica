import { Button } from '@ethica/ui/components/button';
import { DialogFooter } from '@ethica/ui/components/dialog';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { FormDialog } from '@/components/form-dialog.js';
import { Progress } from '@/components/progress.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { FIELD_LABEL } from '../@consts/field-label.js';
import type { PdfFill } from '../@hooks/use-pdf-fill.js';
import { CHOICE_FIELDS, displayValue } from '../@utils/pdf-choices.js';
import { PdfFilesStep } from './pdf-files-step.js';
import { PdfValuesStep } from './pdf-values-step.js';

const STEPS = ['files', 'choose_values', 'fill'];

// AD-183: "Preencher com PDF" in three steps, with the progress on top.
export function PdfFillDialog({ pdf }: { pdf: PdfFill }) {
  const { draft, step } = pdf;
  return (
    <FormDialog title={t('fill_from_pdf')} size="lg" onClose={pdf.close}>
      <div className="grid gap-2">
        <Progress value={step + 1} max={STEPS.length} aria-label={t(STEPS[step] ?? '')} />
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((key, index) => (
            <li key={key}>
              <ItemDescription className={cn(index === step && 'font-medium text-foreground')}>
                {`${index + 1}. ${t(key)}`}
              </ItemDescription>
            </li>
          ))}
        </ol>
      </div>
      {step === 0 && <PdfFilesStep pdf={pdf} />}
      {step === 1 && <PdfValuesStep pdf={pdf} />}
      {step === 2 && (
        <div className="grid gap-3">
          <ItemDescription className="line-clamp-none">{t('fill_summary_description')}</ItemDescription>
          <dl className="grid gap-2">
            {CHOICE_FIELDS.filter((field) => draft[field]).map((field) => (
              <div key={field}>
                <ItemDescription render={<dt />}>{t(FIELD_LABEL[field])}</ItemDescription>
                <ItemTitle render={<dd />}>{displayValue(field, String(draft[field]))}</ItemTitle>
              </div>
            ))}
            {draft.parties && (
              <div>
                <ItemDescription render={<dt />}>{t('parties')}</ItemDescription>
                <ItemTitle render={<dd />} className="line-clamp-none">
                  {draft.parties.map((party) => party.name).join(', ')}
                </ItemTitle>
              </div>
            )}
          </dl>
        </div>
      )}
      <DialogFooter>
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => pdf.setStep(step - 1)}>
            {t('previous')}
          </Button>
        )}
        {step === 0 && (
          <Button type="button" disabled={pdf.reading || !pdf.pdfs.length} onClick={pdf.chooseValues}>
            {t('next')}
          </Button>
        )}
        {step === 1 && (
          <Button type="button" onClick={() => pdf.setStep(2)}>
            {t('next')}
          </Button>
        )}
        {step === 2 && (
          <Button type="button" onClick={pdf.fill}>
            {t('fill')}
          </Button>
        )}
      </DialogFooter>
    </FormDialog>
  );
}
