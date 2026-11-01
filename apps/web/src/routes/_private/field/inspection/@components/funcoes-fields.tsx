import type { VistoriaDados } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemTitle } from '@ethica/ui/components/item';
import { type UseFormReturn, useFieldArray } from 'react-hook-form';
import { NumberField, TextareaField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { ListaCampos } from './lista-campos.js';

// Histórico de funções com a versão de cada parte (CAM-02): [FUNCOES_AUTOR]/[FUNCOES_REU].
export function FuncoesFields({ form }: { form: UseFormReturn<VistoriaDados> }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'funcoes' });
  return (
    <ListaCampos
      titulo={t('roles_and_activities')}
      vazio={t('no_roles_yet')}
      acoes={
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ id: crypto.randomUUID(), titulo: '', plaintiff: {}, defendant: {} })}
        >
          {t('add_role')}
        </Button>
      }
      itens={fields.map((field, index) => ({
        key: field.id,
        onRemove: () => remove(index),
        conteudo: (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                control={form.control}
                name={`funcoes.${index}.titulo`}
                label={t('job_role')}
                placeholder={t('role_placeholder')}
              />
              <TextField
                control={form.control}
                name={`funcoes.${index}.local`}
                label={t('workplace')}
                placeholder={t('workplace_placeholder')}
              />
              <NumberField
                control={form.control}
                name={`funcoes.${index}.anoInicio`}
                label={t('start_year')}
                placeholder="2019"
              />
              <NumberField
                control={form.control}
                name={`funcoes.${index}.anoFim`}
                label={t('end_year')}
                placeholder="2024"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(['plaintiff', 'defendant'] as const).map((versao) => (
                <div key={versao} className="grid gap-3">
                  <ItemTitle>{t(versao === 'plaintiff' ? 'plaintiff_version' : 'defendant_version')}</ItemTitle>
                  <TextareaField
                    control={form.control}
                    name={`funcoes.${index}.${versao}.atividades`}
                    label={t('activities')}
                    placeholder={t('activities_placeholder')}
                  />
                  <TextField
                    control={form.control}
                    name={`funcoes.${index}.${versao}.frequencia`}
                    label={t('frequency')}
                    placeholder={t('frequency_placeholder')}
                  />
                  <TextField
                    control={form.control}
                    name={`funcoes.${index}.${versao}.timeExposure`}
                    label={t('exposure_time')}
                    placeholder={t('exposure_time_placeholder')}
                  />
                </div>
              ))}
            </div>
          </>
        ),
      }))}
    />
  );
}
