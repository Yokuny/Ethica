import { Button } from '@ethica/ui/components/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Checkbox } from '@/components/checkbox.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { identificacaoDaParte, PARTE_TIPO_ITEMS, POLO_ITEMS } from '@/components/parte-labels.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partesQuery } from '@/query/parte.js';
import type { PericiaFormValues } from '../@interface/pericias.interface.js';

// Nome com sugestões do cadastro de partes (AD-117): escolher uma sugestão liga a linha ao
// cadastro (`parteId`); digitar outro nome deixa a API reaproveitar ou criar (AD-115).
function ParteNomeField({ index }: { index: number }) {
  const { control, setValue } = useFormContext<PericiaFormValues>();
  const tipo = useWatch({ control, name: `partes.${index}.tipo` });
  const [q, setQ] = useState('');
  const [, debounce] = useDebouncedSearch('', setQ);
  const sugestoes = useQuery({ ...partesQuery({ q, tipo, limit: 8 }), enabled: q.trim().length >= 2 });
  const listId = `partes-${index}-sugestoes`;

  function handleChange(nome: string, onChange: (value: string) => void) {
    onChange(nome);
    debounce(nome);
    const escolhida = sugestoes.data?.items.find((parte) => parte.nome === nome);
    setValue(`partes.${index}.parteId`, escolhida?.id);
  }

  return (
    <FormField
      control={control}
      name={`partes.${index}.nome`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('name')}</FormLabel>
          <FormControl>
            <Input
              placeholder={t('example_name')}
              list={listId}
              autoComplete="off"
              {...field}
              value={field.value ?? ''}
              onChange={(event) => handleChange(event.target.value, field.onChange)}
            />
          </FormControl>
          <datalist id={listId}>
            {sugestoes.data?.items.map((parte) => (
              <option key={parte.id} value={parte.nome}>
                {identificacaoDaParte(parte)}
              </option>
            ))}
          </datalist>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ParteRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control, getValues, setValue } = useFormContext<PericiaFormValues>();
  const tipo = useWatch({ control, name: `partes.${index}.tipo` });
  const papel = useWatch({ control, name: 'papel' });
  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name={`partes.${index}.polo`}
          label={t('side')}
          placeholder={t('select')}
          items={POLO_ITEMS}
        />
        <SelectField
          control={control}
          name={`partes.${index}.tipo`}
          label={t('type')}
          placeholder={t('select')}
          items={PARTE_TIPO_ITEMS}
        />
        <ParteNomeField index={index} />
        {tipo === 'lawyer' ? (
          <TextField control={control} name={`partes.${index}.oab`} label="OAB" placeholder={t('example_oab')} />
        ) : (
          <TextField
            control={control}
            name={`partes.${index}.documento`}
            label={t('cpf_cnpj')}
            placeholder="000.000.000-00"
          />
        )}
        {/* Quem contratou o assistente técnico (AD-135): marcar uma parte desmarca as outras. */}
        {papel === 'technical_assistant' && (
          <FormField
            control={control}
            name={`partes.${index}.contratante`}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <Checkbox
                  label={t('contracting_party')}
                  checked={field.value === true}
                  onCheckedChange={(marcado) => {
                    if (marcado) {
                      (getValues('partes') ?? []).forEach((_, outro) => {
                        if (outro !== index) setValue(`partes.${outro}.contratante`, undefined);
                      });
                    }
                    field.onChange(marcado === true ? true : undefined);
                  }}
                />
              </FormItem>
            )}
          />
        )}
      </div>
      <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label={t('remove')} onClick={onRemove}>
        <Trash2 />
      </Button>
    </div>
  );
}

// Autor, réu e os advogados de cada polo, ligados ao cadastro de partes (IMP-03).
export function PericiaPartesFields() {
  const { control } = useFormContext<PericiaFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'partes' });
  return (
    <div className="grid gap-8">
      {fields.length === 0 && <ItemDescription>{t('no_parties_yet')}</ItemDescription>}
      {fields.map((field, index) => (
        <ParteRow key={field.id} index={index} onRemove={() => remove(index)} />
      ))}
      <div>
        <Button type="button" variant="outline" onClick={() => append({ polo: 'plaintiff', tipo: 'party', nome: '' })}>
          <Plus />
          {t('add_party')}
        </Button>
      </div>
    </div>
  );
}
