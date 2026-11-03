import { REPORT_FONTS, REPORT_LINE_HEIGHTS, type ReportLayout, reportLayoutSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Checkbox } from '@/components/checkbox.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { NumberField, SelectField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';

// The select works with text: the line spacing travels as a number and is converted on saving.
type LayoutForm = Omit<ReportLayout, 'lineHeight'> & { lineHeight: string };

const FONT_LABEL = { times: 'font_times', arial: 'font_arial' } as const;
const FONT_ITEMS = REPORT_FONTS.map((font) => ({ value: font, label: t(FONT_LABEL[font]) }));
const LINE_HEIGHT_ITEMS = REPORT_LINE_HEIGHTS.map((height) => ({
  value: String(height),
  label: String(height).replace('.', ','),
}));
const PAGES = ['cover', 'summary', 'opening'] as const;
const PAGE_LABEL = { cover: 'cover_page', summary: 'summary_page', opening: 'opening_page' } as const;

type LayoutDialogProps = {
  layout: ReportLayout;
  pending: boolean;
  onClose: () => void;
  onSave: (layout: ReportLayout) => void;
};

// NLA-06: how the report leaves in PDF and Word. Used in the report and in the office template.
export function LayoutDialog({ layout, pending, onClose, onSave }: LayoutDialogProps) {
  const form = useForm<LayoutForm>({ defaultValues: { ...layout, lineHeight: String(layout.lineHeight) } });
  const { control } = form;

  function onSubmit(values: LayoutForm) {
    const parsed = reportLayoutSchema.safeParse({ ...values, lineHeight: Number(values.lineHeight) });
    if (!parsed.success) return void toast.error(t('invalid_data'));
    onSave(parsed.data);
  }

  const margin = (name: 'marginTop' | 'marginBottom' | 'marginLeft' | 'marginRight', label: string) => (
    <NumberField key={name} control={control} name={name} label={t(label)} placeholder="2,5" min={1} step={0.1} />
  );

  return (
    <FormDialog title={t('report_layout')} description={t('report_layout_description')} size="lg" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('font_and_size'),
                fields: [
                  <div key="font" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={control}
                      name="font"
                      label={t('font')}
                      placeholder={t('select')}
                      items={FONT_ITEMS}
                    />
                    <NumberField control={control} name="fontSize" label={t('font_size')} placeholder="12" min={10} />
                  </div>,
                ],
              },
              {
                title: t('margins_and_spacing'),
                fields: [
                  <div key="spacing" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={control}
                      name="lineHeight"
                      label={t('line_spacing')}
                      placeholder={t('select')}
                      items={LINE_HEIGHT_ITEMS}
                    />
                    <NumberField
                      control={control}
                      name="paragraphSpacing"
                      label={t('paragraph_spacing')}
                      placeholder="8"
                      min={0}
                    />
                  </div>,
                  <div key="margins" className="grid gap-4 sm:grid-cols-4">
                    {margin('marginTop', 'margin_top')}
                    {margin('marginBottom', 'margin_bottom')}
                    {margin('marginLeft', 'margin_left')}
                    {margin('marginRight', 'margin_right')}
                  </div>,
                ],
              },
              {
                title: t('pages_and_colors'),
                fields: [
                  <div key="pages" className="flex flex-wrap gap-6">
                    {PAGES.map((page) => (
                      <FormField
                        key={page}
                        control={control}
                        name={page}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            label={t(PAGE_LABEL[page])}
                            onCheckedChange={(checked) => field.onChange(checked)}
                          />
                        )}
                      />
                    ))}
                  </div>,
                  <FormField
                    key="color"
                    control={control}
                    name="titleColor"
                    render={({ field }) => (
                      <FormItem className="w-40">
                        <FormLabel>{t('title_color')}</FormLabel>
                        <FormControl>
                          <Input
                            type="color"
                            value={field.value}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />,
                ],
              },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
