import { INSPECTION_CAPACITIES, type InspectionData } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { type UseFormReturn, useFieldArray } from 'react-hook-form';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { FieldCase } from '@/query/inspection.js';
import { CAPACITY_KEY } from '../../../@consts/field-labels.js';
import { FieldList } from './field-list.js';

const CAPACITIES = INSPECTION_CAPACITIES.map((value) => ({ value, label: t(CAPACITY_KEY[value]) }));

type AttendeesFieldsProps = { form: UseFormReturn<InspectionData>; legalCase?: FieldCase };

// Who was at the inspection (CAM-02): name, capacity and e-mail; the signatures are collected in the notes tab
// (LOG-06).
export function AttendeesFields({ form, legalCase }: AttendeesFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'attendees' });

  function addParties() {
    const names = (text: string | undefined) => (text ? text.split(', ') : []);
    for (const name of names(legalCase?.plaintiff)) append({ id: crypto.randomUUID(), name, capacity: 'plaintiff' });
    for (const name of names(legalCase?.defendant)) append({ id: crypto.randomUUID(), name, capacity: 'defendant' });
  }

  return (
    <FieldList
      title={t('attendees')}
      empty={t('no_attendees_yet')}
      actions={
        <>
          {legalCase && (
            <Button type="button" variant="outline" onClick={addParties}>
              {t('add_case_parties')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ id: crypto.randomUUID(), name: '', capacity: 'witness' })}
          >
            {t('add_attendee')}
          </Button>
        </>
      }
      items={fields.map((field, index) => ({
        key: field.id,
        onRemove: () => remove(index),
        content: (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                control={form.control}
                name={`attendees.${index}.name`}
                label={t('name')}
                placeholder={t('full_name')}
              />
              <SelectField
                control={form.control}
                name={`attendees.${index}.capacity`}
                label={t('attendee_role')}
                placeholder={t('choose')}
                items={CAPACITIES}
              />
            </div>
            <TextField
              control={form.control}
              name={`attendees.${index}.email`}
              label={t('email')}
              placeholder={t('email_placeholder')}
            />
          </>
        ),
      }))}
    />
  );
}
