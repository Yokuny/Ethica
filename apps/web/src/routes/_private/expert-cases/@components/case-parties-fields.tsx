import { Button } from '@ethica/ui/components/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { Checkbox } from '@/components/checkbox.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { PARTY_TYPE_ITEMS, partyIdentification, sideItems } from '@/components/party-labels.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partiesQuery } from '@/query/party.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

// Name with suggestions from the party registry (AD-117): picking a suggestion links the row to the
// record (`partyId`); typing another name lets the API reuse or create one (AD-115).
function PartyNameField({ index }: { index: number }) {
  const { control, setValue } = useFormContext<CaseFormValues>();
  const type = useWatch({ control, name: `parties.${index}.type` });
  const [q, setQ] = useState('');
  const [, debounce] = useDebouncedSearch('', setQ);
  const suggestions = useQuery({ ...partiesQuery({ q, type, limit: 8 }), enabled: q.trim().length >= 2 });
  const listId = `parties-${index}-suggestions`;

  function handleChange(name: string, onChange: (value: string) => void) {
    onChange(name);
    debounce(name);
    const escolhida = suggestions.data?.items.find((party) => party.name === name);
    setValue(`parties.${index}.partyId`, escolhida?.id);
  }

  return (
    <FormField
      control={control}
      name={`parties.${index}.name`}
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
            {suggestions.data?.items.map((party) => (
              <option key={party.id} value={party.name}>
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
  const type = useWatch({ control, name: `parties.${index}.type` });
  const role = useWatch({ control, name: 'role' });
  const courtType = useWatch({ control, name: 'courtType' });
  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name={`parties.${index}.side`}
          label={t('side')}
          placeholder={t('select')}
          items={sideItems(courtType)}
        />
        <SelectField
          control={control}
          name={`parties.${index}.type`}
          label={t('type')}
          placeholder={t('select')}
          items={PARTY_TYPE_ITEMS}
        />
        <PartyNameField index={index} />
        {type === 'lawyer' ? (
          <TextField control={control} name={`parties.${index}.oab`} label="OAB" placeholder={t('example_oab')} />
        ) : (
          <TextField
            control={control}
            name={`parties.${index}.document`}
            label={t('cpf_cnpj')}
            placeholder="000.000.000-00"
          />
        )}
        {/* Whoever hired the technical assistant (AD-135): checking one party unchecks the others. */}
        {role === 'technical_assistant' && (
          <FormField
            control={control}
            name={`parties.${index}.client`}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <Checkbox
                  label={t('contracting_party')}
                  checked={field.value === true}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      (getValues('parties') ?? []).forEach((_, other) => {
                        if (other !== index) setValue(`parties.${other}.client`, undefined);
                      });
                    }
                    field.onChange(checked === true ? true : undefined);
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

// Plaintiff, defendant and the lawyers of each side, linked to the party registry (IMP-03).
export function CasePartiesFields() {
  const { control } = useFormContext<CaseFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'parties' });
  // Error of the list itself (e.g. too many parties): without it, saving would fail with nothing on screen.
  const { errors } = useFormState({ control, name: 'parties' });
  const listError = errors.parties?.root?.message ?? errors.parties?.message;
  return (
    <div className="grid gap-8">
      {fields.length === 0 && <ItemDescription>{t('no_parties_yet')}</ItemDescription>}
      {fields.map((field, index) => (
        <PartyRow key={field.id} index={index} onRemove={() => remove(index)} />
      ))}
      {listError && (
        <ItemDescription role="alert" className="text-destructive line-clamp-none">
          {listError}
        </ItemDescription>
      )}
      <div>
        <Button type="button" variant="outline" onClick={() => append({ side: 'plaintiff', type: 'party', name: '' })}>
          <Plus />
          {t('add_party')}
        </Button>
      </div>
    </div>
  );
}
