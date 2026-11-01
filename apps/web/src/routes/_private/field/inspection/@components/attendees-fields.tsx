import { INSPECTION_CAPACITIES, type InspectionData } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useState } from 'react';
import { type UseFormReturn, useFieldArray } from 'react-hook-form';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { FieldCase } from '@/query/inspection.js';
import { CAPACITY_KEY } from '../../@consts/field-labels.js';
import { FieldList } from './field-list.js';
import { SignatureDialog } from './signature-dialog.js';

const CAPACITIES = INSPECTION_CAPACITIES.map((value) => ({ value, label: t(CAPACITY_KEY[value]) }));

type AttendeesFieldsProps = {
  form: UseFormReturn<InspectionData>;
  legalCase?: FieldCase;
  onSignature: (blob: Blob) => Promise<string>;
};

// Who was at the inspection (CAM-02, CAM-06): name, capacity, e-mail and on-screen signature.
export function AttendeesFields({ form, legalCase, onSignature }: AttendeesFieldsProps) {
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'attendees' });
  const [signing, setSigning] = useState<number | null>(null);

  function addParties() {
    const names = (text: string | undefined) => (text ? text.split(', ') : []);
    for (const name of names(legalCase?.plaintiff)) append({ id: crypto.randomUUID(), name, capacity: 'plaintiff' });
    for (const name of names(legalCase?.defendant)) append({ id: crypto.randomUUID(), name, capacity: 'defendant' });
  }

  return (
    <>
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
          conteudo: (
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
              <div className="flex items-center gap-2">
                {field.signatureId ? (
                  <Badge variant="success">{t('signed')}</Badge>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setSigning(index)}>
                    {t('collect_signature')}
                  </Button>
                )}
              </div>
            </>
          ),
        }))}
      />
      {signing !== null && (
        <SignatureDialog
          name={form.getValues(`attendees.${signing}.name`)}
          onClose={() => setSigning(null)}
          onConfirm={async (blob) => {
            const signatureId = await onSignature(blob);
            update(signing, { ...form.getValues(`attendees.${signing}`), signatureId });
            setSigning(null);
          }}
        />
      )}
    </>
  );
}
