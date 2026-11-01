import { REPORT_LEVEL_MAX } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Checkbox } from '@/components/checkbox.js';
import { FormDialog } from '@/components/form-dialog.js';
import { TextField } from '@/components/form-fields.js';
import { RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TemplateSectionRecord } from '@/query/report.js';
import { useTemplateSectionForm } from '../@hooks/use-template-section-form.js';

const LEVELS = Array.from({ length: REPORT_LEVEL_MAX }, (_, i) => ({
  value: String(i + 1),
  label: `${t('level')} ${i + 1}`,
}));

type TemplateSectionFormProps = { templateId: string; section?: TemplateSectionRecord; onClose: () => void };

export function TemplateSectionForm({ templateId, section, onClose }: TemplateSectionFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useTemplateSectionForm({ templateId, section, onDone: onClose });
  const { control } = form;
  const titleOnly = form.watch('titleOnly');

  return (
    <FormDialog title={t(section ? 'edit_section' : 'new_section')} size="lg" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <TextField
              control={control}
              name="titulo"
              label={t('section_title')}
              placeholder={t('section_title_placeholder')}
            />
            <FormField
              control={control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('level')}</FormLabel>
                  <Select
                    items={LEVELS}
                    value={String(field.value)}
                    onValueChange={(value) => value && field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('level')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEVELS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <FormField
              control={control}
              name="titleOnly"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  label={t('title_only')}
                />
              )}
            />
            <FormField
              control={control}
              name="pageBreak"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  label={t('page_break_before')}
                />
              )}
            />
          </div>
          {!titleOnly &&
            (['yesText', 'noText'] as const).map((name) => (
              <FormField
                key={name}
                control={control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(name === 'yesText' ? 'yes_text' : 'no_text')}</FormLabel>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      label={t(name === 'yesText' ? 'yes_text' : 'no_text')}
                    />
                  </FormItem>
                )}
              />
            ))}
          {errorMessage && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {errorMessage}
            </ItemDescription>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
