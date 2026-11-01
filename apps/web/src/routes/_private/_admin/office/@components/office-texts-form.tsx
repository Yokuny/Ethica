import { DOCUMENT_MARKERS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { TextareaField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useOfficeForm } from '../@hooks/use-office-form.js';
import type { OfficeView } from '../@query/office.js';

export function OfficeTextsForm({ office }: { office: OfficeView }) {
  const { form, onSubmit, isPending } = useOfficeForm(office);
  const { control } = form;
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <div className="grid w-full gap-4">
          <TextareaField control={control} name="header" label={t('header')} placeholder={t('header_placeholder')} />
          <TextareaField control={control} name="footer" label={t('footer')} placeholder={t('footer_placeholder')} />
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
