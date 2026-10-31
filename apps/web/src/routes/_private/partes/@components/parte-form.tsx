import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { useWatch } from 'react-hook-form';
import { FormDialog } from '@/components/form-dialog.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { PARTE_TIPO_ITEMS } from '@/components/parte-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ParteRecord } from '@/query/parte.js';
import { useParteForm } from '../@hooks/use-parte-form.js';

type ParteFormProps = { parte?: ParteRecord; onClose: () => void; onSaved?: (saved: ParteRecord) => void };

export function ParteForm({ parte, onClose, onSaved }: ParteFormProps) {
  const { form, onSubmit, isPending, errorMessage } = useParteForm({
    parte,
    onDone: (saved) => {
      onSaved?.(saved);
      onClose();
    },
  });
  const { control } = form;
  const tipo = useWatch({ control, name: 'tipo' });

  return (
    <FormDialog title={t(parte ? 'edit_party' : 'new_party')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <SelectField
            control={control}
            name="tipo"
            label={t('type')}
            placeholder={t('select')}
            items={PARTE_TIPO_ITEMS}
            disabled={Boolean(parte)}
          />
          <TextField control={control} name="nome" label={t('name')} placeholder={t('example_name')} />
          {tipo === 'lawyer' ? (
            <TextField control={control} name="oab" label="OAB" placeholder={t('example_oab')} />
          ) : (
            <TextField control={control} name="documento" label={t('cpf_cnpj')} placeholder="000.000.000-00" />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={control} name="email" label={t('email')} placeholder={t('example_email')} />
            <TextField control={control} name="telefone" label={t('phone')} placeholder="(11) 90000-0000" />
          </div>
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
