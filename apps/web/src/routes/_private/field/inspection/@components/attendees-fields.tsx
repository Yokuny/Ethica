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

// Quem estava na vistoria (CAM-02, CAM-06): nome, qualidade, e-mail e assinatura na tela.
export function AttendeesFields({ form, legalCase, onSignature }: AttendeesFieldsProps) {
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'attendees' });
  const [signing, setSigning] = useState<number | null>(null);

  function addParties() {
    const nomes = (texto: string | undefined) => (texto ? texto.split(', ') : []);
    for (const nome of nomes(legalCase?.plaintiff)) append({ id: crypto.randomUUID(), nome, capacity: 'plaintiff' });
    for (const nome of nomes(legalCase?.defendant)) append({ id: crypto.randomUUID(), nome, capacity: 'defendant' });
  }

  return (
    <>
      <FieldList
        titulo={t('attendees')}
        vazio={t('no_attendees_yet')}
        acoes={
          <>
            {legalCase && (
              <Button type="button" variant="outline" onClick={addParties}>
                {t('add_case_parties')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ id: crypto.randomUUID(), nome: '', capacity: 'witness' })}
            >
              {t('add_attendee')}
            </Button>
          </>
        }
        itens={fields.map((field, index) => ({
          key: field.id,
          onRemove: () => remove(index),
          conteudo: (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  control={form.control}
                  name={`attendees.${index}.nome`}
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
          nome={form.getValues(`attendees.${signing}.nome`)}
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
