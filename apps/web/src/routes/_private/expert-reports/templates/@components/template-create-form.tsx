import { REPORT_TYPES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { FormDialog } from '@/components/form-dialog.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type TemplateRecord, templatesQuery } from '@/query/report.js';
import { useTemplateCreateForm } from '../@hooks/use-template-create-form.js';

const BLANK = 'blank';

type TemplateCreateFormProps = {
  base?: Pick<TemplateRecord, 'id' | 'name' | 'type'>;
  onDone: (template: TemplateRecord) => void;
  onClose: () => void;
};

export function TemplateCreateForm({ base, onDone, onClose }: TemplateCreateFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useTemplateCreateForm({ base, onDone });
  const type = form.watch('type');
  const templates = useQuery(templatesQuery(type));
  const bases = [
    { value: BLANK, label: t('blank_template') },
    ...(templates.data ?? []).map((template) => ({ value: template.id, label: template.name })),
  ];

  return (
    <FormDialog title={t(base ? 'duplicate_template' : 'new_template')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <TextField
            control={form.control}
            name="name"
            label={t('name')}
            placeholder={t('template_name_placeholder')}
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
