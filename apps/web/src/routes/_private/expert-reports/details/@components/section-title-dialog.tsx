import { addReportSectionSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormDialog } from '@/components/form-dialog.js';
import { TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';

const titleSchema = addReportSectionSchema.pick({ title: true });

type SectionTitleDialogProps = {
  heading: string;
  title?: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
};

// Title of an item or subitem of the report: a new one (NLA-05) or renaming an existing one.
export function SectionTitleDialog({ heading, title = '', pending, onClose, onConfirm }: SectionTitleDialogProps) {
  const form = useForm<{ title: string }>({ resolver: zodResolver(titleSchema), defaultValues: { title } });
  return (
    <FormDialog title={heading} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit((data) => onConfirm(data.title))} className="flex flex-col gap-4">
          <TextField control={form.control} name="title" label={t('section_title')} placeholder={t('section_title')} />
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
