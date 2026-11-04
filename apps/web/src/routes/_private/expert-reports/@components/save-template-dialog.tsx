import { type UpdateTemplate, updateTemplateSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormDialog } from '@/components/form-dialog.js';
import { TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';

type SaveTemplateDialogProps = {
  name: string;
  // Attached report (ANL-04): asked right after attaching, with the PDF headings as the items.
  attached?: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (data: UpdateTemplate) => void;
};

// AD-170: the report as it is (items that are part of it and their text) becomes an office template.
export function SaveTemplateDialog({ name, attached, pending, onClose, onConfirm }: SaveTemplateDialogProps) {
  const form = useForm<UpdateTemplate>({ resolver: zodResolver(updateTemplateSchema), defaultValues: { name } });
  return (
    <FormDialog
      title={t(attached ? 'save_attached_as_template_question' : 'save_as_template')}
      description={t(attached ? 'save_attached_as_template_description' : 'save_as_template_description')}
      size="sm"
      onClose={onClose}
    >
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onConfirm)} className="flex flex-col gap-4">
          <TextField
            control={form.control}
            name="name"
            label={t('name')}
            placeholder={t('template_name_placeholder')}
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
