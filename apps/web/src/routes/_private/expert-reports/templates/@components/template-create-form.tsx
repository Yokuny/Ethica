import { REPORT_TYPES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { FormDialog } from '@/components/form-dialog.js';
import { SelectField, TextareaField, TextField } from '@/components/form-fields.js';
import { templateAreaItems } from '@/components/report-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import { type TemplateRecord, templatesQuery } from '@/query/report.js';
import { useTemplateCreateForm } from '../@hooks/use-template-create-form.js';

const BLANK = 'blank';

type TemplateCreateFormProps = {
  base?: Pick<TemplateRecord, 'id' | 'name' | 'type' | 'area' | 'isDefault'>;
  onDone: (template: TemplateRecord) => void;
  onClose: () => void;
};

export function TemplateCreateForm({ base, onDone, onClose }: TemplateCreateFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useTemplateCreateForm({ base, onDone });
  const type = form.watch('type');
  const templates = useQuery(templatesQuery(type));
  const serviceTypes = useQuery(serviceTypesQuery);
  const bases = [
    { value: BLANK, label: t('blank_template') },
    ...(templates.data ?? []).map((template) => ({ value: template.id, label: template.name })),
  ];

  return (
    <FormDialog
      title={t(base?.isDefault ? 'use_in_office' : base ? 'duplicate_template' : 'new_template')}
      size="sm"
      onClose={onClose}
    >
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <TextField
            control={form.control}
            name="name"
            label={t('name')}
            placeholder={t('template_name_placeholder')}
          />
          <TextareaField
            control={form.control}
            name="details"
            label={t('template_details')}
            placeholder={t('template_details_placeholder')}
          />
          <SelectField
            control={form.control}
            name="type"
            label={t('document_type')}
            placeholder={t('choose_type')}
            items={REPORT_TYPES.map((value) => ({ value, label: t(value) }))}
            onValueChange={() => form.setValue('baseId', undefined)}
          />
          <SelectField
            control={form.control}
            name="area"
            label={t('practice_area')}
            placeholder={t('no_area')}
            items={templateAreaItems(serviceTypes.data ?? [])}
          />
          <SelectField
            control={form.control}
            name="baseId"
            label={t('start_from')}
            placeholder={t('blank_template')}
            items={bases}
            onValueChange={(value) => value === BLANK && form.setValue('baseId', undefined)}
          />
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
              {t('create')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
