import { type UpdateTemplate, updateTemplateSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormDialog } from '@/components/form-dialog.js';
import { TextareaField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';

type SaveTemplateDialogProps = {
  title: string;
  description?: string;
  values: UpdateTemplate;
  pending: boolean;
  onClose: () => void;
  onConfirm: (data: UpdateTemplate) => void;
};

// Name and details of an office template (AD-181): saving a report as a template (AD-170, ANL-04) and editing it.
export function SaveTemplateDialog({
  title,
  description,
  values,
  pending,
  onClose,
  onConfirm,
}: SaveTemplateDialogProps) {
  const form = useForm<UpdateTemplate>({ resolver: zodResolver(updateTemplateSchema), defaultValues: values });
  return (
    <FormDialog title={title} description={description} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onConfirm)} className="flex flex-col gap-4">
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
