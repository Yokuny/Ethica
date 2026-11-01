import { LAUDO_TIPOS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { FormDialog } from '@/components/form-dialog.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type ModeloLaudoRecord, modelosQuery } from '@/query/laudo.js';
import { useModeloCreateForm } from '../@hooks/use-modelo-create-form.js';

const BLANK = 'blank';

type ModeloCreateFormProps = {
  base?: Pick<ModeloLaudoRecord, 'id' | 'nome' | 'tipo'>;
  onDone: (modelo: ModeloLaudoRecord) => void;
  onClose: () => void;
};

export function ModeloCreateForm({ base, onDone, onClose }: ModeloCreateFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useModeloCreateForm({ base, onDone });
  const tipo = form.watch('tipo');
  const modelos = useQuery(modelosQuery(tipo));
  const bases = [
    { value: BLANK, label: t('blank_template') },
    ...(modelos.data ?? []).map((modelo) => ({ value: modelo.id, label: modelo.nome })),
  ];

  return (
    <FormDialog title={t(base ? 'duplicate_template' : 'new_template')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <TextField
            control={form.control}
            name="nome"
            label={t('name')}
            placeholder={t('template_name_placeholder')}
          />
          <SelectField
            control={form.control}
            name="tipo"
            label={t('document_type')}
            placeholder={t('choose_type')}
            items={LAUDO_TIPOS.map((value) => ({ value, label: t(value) }))}
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
