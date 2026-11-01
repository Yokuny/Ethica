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
import { PARTY_TYPE_ITEMS, partyIdentification, SIDE_ITEMS } from '@/components/party-labels.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partiesQuery } from '@/query/party.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

// Nome com sugestões do cadastro de partes (AD-117): escolher uma sugestão liga a linha ao
// cadastro (`parteId`); digitar outro nome deixa a API reaproveitar ou criar (AD-115).
function PartyNameField({ index }: { index: number }) {
  const { control, setValue } = useFormContext<CaseFormValues>();
  const tipo = useWatch({ control, name: `parties.${index}.tipo` });
  const [q, setQ] = useState('');
  const [, debounce] = useDebouncedSearch('', setQ);
  const sugestoes = useQuery({ ...partiesQuery({ q, tipo, limit: 8 }), enabled: q.trim().length >= 2 });
  const listId = `parties-${index}-sugestoes`;

  function handleChange(nome: string, onChange: (value: string) => void) {
    onChange(nome);
    debounce(nome);
    const escolhida = sugestoes.data?.items.find((party) => party.nome === nome);
    setValue(`parties.${index}.partyId`, escolhida?.id);
  }

  return (
    <FormField
      control={control}
      name={`parties.${index}.nome`}
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
            {sugestoes.data?.items.map((party) => (
              <option key={party.id} value={party.nome}>
                {partyIdentification(party)}
              </option>
            ))}
          </datalist>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PartyRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control, getValues, setValue } = useFormContext<CaseFormValues>();
  const tipo = useWatch({ control, name: `parties.${index}.tipo` });
  const role = useWatch({ control, name: 'role' });
  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name={`parties.${index}.side`}
          label={t('side')}
          placeholder={t('select')}
          items={SIDE_ITEMS}
        />
        <SelectField
          control={control}
          name={`parties.${index}.tipo`}
          label={t('type')}
          placeholder={t('select')}
          items={PARTY_TYPE_ITEMS}
        />
        <PartyNameField index={index} />
        {tipo === 'lawyer' ? (
          <TextField control={control} name={`parties.${index}.oab`} label="OAB" placeholder={t('example_oab')} />
        ) : (
          <TextField
            control={control}
            name={`parties.${index}.documento`}
            label={t('cpf_cnpj')}
            placeholder="000.000.000-00"
          />
        )}
        {/* Quem contratou o assistente técnico (AD-135): marcar uma parte desmarca as outras. */}
        {role === 'technical_assistant' && (
          <FormField
            control={control}
            name={`parties.${index}.client`}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <Checkbox
                  label={t('contracting_party')}
                  checked={field.value === true}
                  onCheckedChange={(marcado) => {
                    if (marcado) {
                      (getValues('parties') ?? []).forEach((_, outro) => {
                        if (outro !== index) setValue(`parties.${outro}.client`, undefined);
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
export function CasePartiesFields() {
  const { control } = useFormContext<CaseFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'parties' });
  return (
    <div className="grid gap-8">
      {fields.length === 0 && <ItemDescription>{t('no_parties_yet')}</ItemDescription>}
      {fields.map((field, index) => (
        <PartyRow key={field.id} index={index} onRemove={() => remove(index)} />
      ))}
      <div>
        <Button type="button" variant="outline" onClick={() => append({ side: 'plaintiff', tipo: 'party', nome: '' })}>
          <Plus />
          {t('add_party')}
        </Button>
      </div>
    </div>
  );
}
