import { POLOS, type VistoriaDados } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { FormField } from '@ethica/ui/components/form';
import { type UseFormReturn, useFieldArray } from 'react-hook-form';
import { Checkbox } from '@/components/checkbox.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { POLO_INDICADO_KEY } from '../../@consts/campo-labels.js';
import { ListaCampos } from './lista-campos.js';

const POLO_ITEMS = POLOS.map((value) => ({ value, label: t(POLO_INDICADO_KEY[value]) }));

// Paradigmas indicados por cada parte (CAM-02): viram [PARADIGMAS_AUTOR]/[PARADIGMAS_REU] no laudo.
export function ParadigmasFields({ form }: { form: UseFormReturn<VistoriaDados> }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'paradigmas' });
  return (
    <ListaCampos
      titulo={t('paradigms')}
      vazio={t('no_paradigms_yet')}
      acoes={
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ id: crypto.randomUUID(), polo: 'plaintiff', nome: '' })}
        >
          {t('add_paradigm')}
        </Button>
      }
      itens={fields.map((field, index) => ({
        key: field.id,
        onRemove: () => remove(index),
        conteudo: (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name={`paradigmas.${index}.polo`}
                label={t('indicated_by')}
                placeholder={t('choose')}
                items={POLO_ITEMS}
              />
              <TextField
                control={form.control}
                name={`paradigmas.${index}.nome`}
                label={t('name')}
                placeholder={t('full_name')}
              />
              <TextField
                control={form.control}
                name={`paradigmas.${index}.funcao`}
                label={t('job_role')}
                placeholder={t('role_placeholder')}
              />
              <TextField
                control={form.control}
                name={`paradigmas.${index}.periodo`}
                label={t('period')}
                placeholder={t('period_placeholder')}
              />
            </div>
            <FormField
              control={form.control}
              name={`paradigmas.${index}.trabalhouJunto`}
              render={({ field: campo }) => (
                <Checkbox
                  checked={Boolean(campo.value)}
                  onCheckedChange={(checked) => campo.onChange(Boolean(checked))}
                  label={t('worked_together')}
                  labelClassName="normal-case tracking-normal"
                />
              )}
            />
          </>
        ),
      }))}
    />
  );
}
