import type { Side } from '@ethica/contracts';
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
import { partyIdentification, sideItems } from '@/components/party-labels.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partiesQuery } from '@/query/party.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

// Name with suggestions from the party registry (AD-117): picking a suggestion links the row to the
// record (`partyId`); typing another name lets the API reuse or create one (AD-115).
function PartyNameField({ index, label = t('name') }: { index: number; label?: string }) {
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
          <FormLabel>{label}</FormLabel>
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

type PartyRowProps = {
  index: number;
  onRemoveLawyer: (index: number) => void;
  // Lawyers that follow this party (PSV-01): they inherit its side.
  lawyerIndexes: number[];
  onRemove: () => void;
  onAddLawyer: () => void;
};

// A party (reclamante/reclamada or autor/réu, by the court type) with the lawyers that represent it.
function PartyRow({ index, lawyerIndexes, onRemove, onAddLawyer, onRemoveLawyer }: PartyRowProps) {
  const { control, getValues, setValue } = useFormContext<CaseFormValues>();
  const role = useWatch({ control, name: 'role' });
  const courtType = useWatch({ control, name: 'courtType' });
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <SelectField
            control={control}
            name={`parties.${index}.side`}
            label={t('side')}
            placeholder={t('select')}
            items={sideItems(courtType)}
            onValueChange={(side) => {
              for (const lawyer of lawyerIndexes) setValue(`parties.${lawyer}.side`, side as Side);
            }}
          />
          <PartyNameField index={index} />
          <TextField
            control={control}
            name={`parties.${index}.document`}
            label={t('cpf_cnpj')}
            placeholder="000.000.000-00"
          />
          {/* Whoever hired the technical assistant (AD-135): checking one party unchecks the others. */}
          {role === 'technical_assistant' && (
            <FormField
              control={control}
              name={`parties.${index}.client`}
              render={({ field }) => (
                <FormItem className="self-end">
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
      <div className="grid gap-4 border-l pl-4 sm:ml-4">
        {lawyerIndexes.map((lawyer) => (
          <LawyerRow key={lawyer} index={lawyer} onRemove={() => onRemoveLawyer(lawyer)} />
        ))}
        <div>
          <Button type="button" variant="ghost" onClick={onAddLawyer}>
            <Plus />
            {t('add_lawyer')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Lawyer inside the party it represents: name and OAB; the side is the party's.
function LawyerRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control } = useFormContext<CaseFormValues>();
  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <PartyNameField index={index} label={t('lawyer')} />
        <TextField control={control} name={`parties.${index}.oab`} label="OAB" placeholder={t('example_oab')} />
      </div>
      <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label={t('remove')} onClick={onRemove}>
        <Trash2 />
      </Button>
    </div>
  );
}

// PSV-01: each party with its lawyers. The order of the list says who represents whom: a lawyer comes
// right after the party of the same side (the PDF import already reads them in this order).
export function CasePartiesFields() {
  const { control, getValues } = useFormContext<CaseFormValues>();
  const { fields, append, insert, remove } = useFieldArray({ control, name: 'parties' });
  // Error of the list itself (e.g. too many parties): without it, saving would fail with nothing on screen.
  const { errors } = useFormState({ control, name: 'parties' });
  const listError = errors.parties?.root?.message ?? errors.parties?.message;
  const groups: { index: number; lawyers: number[] }[] = [];
  const loose: number[] = [];
  fields.forEach((field, index) => {
    const last = groups.at(-1);
    if (field.type === 'party') groups.push({ index, lawyers: [] });
    else if (last && getValues(`parties.${last.index}.side`) === getValues(`parties.${index}.side`))
      last.lawyers.push(index);
    else loose.push(index);
  });

  function addLawyer(group: { index: number; lawyers: number[] }) {
    const side = getValues(`parties.${group.index}.side`) ?? 'plaintiff';
    insert((group.lawyers.at(-1) ?? group.index) + 1, { side, type: 'lawyer', name: '' });
  }

  return (
    <div className="grid gap-8">
      {fields.length === 0 && <ItemDescription>{t('no_parties_yet')}</ItemDescription>}
      {groups.map((group) => (
        <PartyRow
          key={fields[group.index]?.id}
          index={group.index}
          lawyerIndexes={group.lawyers}
          onAddLawyer={() => addLawyer(group)}
          onRemoveLawyer={remove}
          // The party leaves with its lawyers.
          onRemove={() => remove([group.index, ...group.lawyers])}
        />
      ))}
      {/* Lawyer saved before a party of its side (older services): shown on its own. */}
      {loose.map((index) => (
        <LawyerRow key={fields[index]?.id} index={index} onRemove={() => remove(index)} />
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
