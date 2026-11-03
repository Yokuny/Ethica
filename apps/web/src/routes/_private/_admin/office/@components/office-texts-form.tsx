import { DOCUMENT_MARKERS, REPORT_FONTS, TEXT_ALIGNMENTS, type UpdateOffice } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import type { Control } from 'react-hook-form';
import { NumberField, SelectField, TextareaField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useOfficeForm } from '../@hooks/use-office-form.js';
import type { OfficeView } from '../@query/office.js';

const FONT_LABEL = { times: 'font_times', arial: 'font_arial' } as const;
const FONT_ITEMS = REPORT_FONTS.map((font) => ({ value: font, label: t(FONT_LABEL[font]) }));
const ALIGN_LABEL = { left: 'align_left', center: 'align_center', right: 'align_right' } as const;
const ALIGN_ITEMS = TEXT_ALIGNMENTS.map((align) => ({ value: align, label: t(ALIGN_LABEL[align]) }));

export function OfficeTextsForm({ office }: { office: OfficeView }) {
  const { form, onSubmit, isPending } = useOfficeForm(office);
  const { control } = form;
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <div className="grid w-full gap-4">
          <TextareaField control={control} name="header" label={t('header')} placeholder={t('header_placeholder')} />
          <TextStyleFields control={control} name="headerStyle" />
          <TextareaField control={control} name="footer" label={t('footer')} placeholder={t('footer_placeholder')} />
          <TextStyleFields control={control} name="footerStyle" />
          <ItemDescription className="line-clamp-none">
            {t('document_markers_hint')} {DOCUMENT_MARKERS.join(' · ')}
          </ItemDescription>
        </div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}

// Font, size and alignment of the text above, in PDF and Word (AD-172).
function TextStyleFields({ control, name }: { control: Control<UpdateOffice>; name: 'headerStyle' | 'footerStyle' }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SelectField
        control={control}
        name={`${name}.font`}
        label={t('font')}
        placeholder={t('select')}
        items={FONT_ITEMS}
      />
      <NumberField
        control={control}
        name={`${name}.fontSize`}
        label={t('font_size')}
        placeholder="8,5"
        min={6}
        step={0.5}
      />
      <SelectField
        control={control}
        name={`${name}.align`}
        label={t('alignment')}
        placeholder={t('select')}
        items={ALIGN_ITEMS}
      />
    </div>
  );
}
