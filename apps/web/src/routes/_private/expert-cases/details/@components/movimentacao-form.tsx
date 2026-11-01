import { MOVIMENTACAO_TIPOS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, SelectField, TextareaField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useMovimentacaoForm } from '../@hooks/use-movimentacao-form.js';

const TIPOS = MOVIMENTACAO_TIPOS.map((tipo) => ({ value: tipo, label: t(tipo) }));

export function MovimentacaoForm({ periciaId, onClose }: { periciaId: string; onClose: () => void }) {
  const { form, onSubmit, isPending, errorMessage } = useMovimentacaoForm({ periciaId, onDone: onClose });
  const { control } = form;

  return (
    <FormDialog title={t('new_movement')} description={t('movement_description')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <SelectField control={control} name="tipo" label={t('type')} placeholder={t('choose_type')} items={TIPOS} />
          <DateField control={control} name="data" label={t('date')} placeholder={t('choose_day')} />
          <TextareaField control={control} name="observacoes" label={t('notes')} placeholder={t('notes_placeholder')} />
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
