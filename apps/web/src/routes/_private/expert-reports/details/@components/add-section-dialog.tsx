import { type AddReportSection, addReportSectionSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { FormDialog } from '@/components/form-dialog.js';
import { TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';

type AddSectionDialogProps = {
  afterId: string;
  // Level of the item it goes after: the new one is the same level or one below (sub-item).
  level: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: (data: AddReportSection) => void;
};

// NLA-05: blank item or sub-item right after the chosen item.
export function AddSectionDialog({ afterId, level, pending, onClose, onConfirm }: AddSectionDialogProps) {
  const form = useForm<AddReportSection>({
    resolver: zodResolver(addReportSectionSchema),
    defaultValues: { title: '', level, afterId },
  });
  const chosen = useWatch({ control: form.control, name: 'level' });
  return (
    <FormDialog title={t('add_item')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onConfirm)} className="flex flex-col gap-4">
          <TextField control={form.control} name="title" label={t('section_title')} placeholder={t('section_title')} />
          {level < 3 && (
            <ToggleGroup
              aria-label={t('item_type')}
              value={String(chosen)}
              onValueChange={(value) => form.setValue('level', Number(value))}
            >
              <ToggleGroupItem value={String(level)}>{t('same_level_item')}</ToggleGroupItem>
              <ToggleGroupItem value={String(level + 1)}>{t('sub_item')}</ToggleGroupItem>
            </ToggleGroup>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {t('add_item')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
