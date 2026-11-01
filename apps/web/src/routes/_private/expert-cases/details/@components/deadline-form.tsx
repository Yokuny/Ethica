import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, TextareaField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { DeadlineRecord } from '@/query/deadline.js';
import { useDeadlineForm } from '../@hooks/use-deadline-form.js';

type DeadlineFormProps = { caseId: string; deadline?: DeadlineRecord; onClose: () => void };

export function DeadlineForm({ caseId, deadline, onClose }: DeadlineFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useDeadlineForm({ caseId, deadline, onDone: onClose });
  const { control } = form;

  return (
    <FormDialog title={t(deadline ? 'edit_deadline' : 'new_deadline')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <TextField control={control} name="title" label={t('title')} placeholder={t('example_deadline_title')} />
          <DateField control={control} name="dueDate" label={t('due_date')} placeholder={t('choose_day')} />
          <TextareaField control={control} name="notes" label={t('notes')} placeholder={t('notes_placeholder')} />
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
