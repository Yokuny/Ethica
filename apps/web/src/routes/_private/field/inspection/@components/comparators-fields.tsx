import { type InspectionData, SIDES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { FormField } from '@ethica/ui/components/form';
import { type UseFormReturn, useFieldArray } from 'react-hook-form';
import { Checkbox } from '@/components/checkbox.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { INDICATED_SIDE_KEY } from '../../@consts/field-labels.js';
import { FieldList } from './field-list.js';

const SIDE_ITEMS = SIDES.map((value) => ({ value, label: t(INDICATED_SIDE_KEY[value]) }));

// Comparators named by each party (CAM-02): they become [PARADIGMAS_AUTOR]/[PARADIGMAS_REU] in the report.
export function ComparatorsFields({ form }: { form: UseFormReturn<InspectionData> }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'comparators' });
  return (
    <FieldList
      title={t('paradigms')}
      empty={t('no_paradigms_yet')}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ id: crypto.randomUUID(), side: 'plaintiff', name: '' })}
        >
          {t('add_paradigm')}
        </Button>
      }
      items={fields.map((field, index) => ({
        key: field.id,
        onRemove: () => remove(index),
        conteudo: (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name={`comparators.${index}.side`}
                label={t('indicated_by')}
                placeholder={t('choose')}
                items={SIDE_ITEMS}
              />
              <TextField
                control={form.control}
                name={`comparators.${index}.name`}
                label={t('name')}
                placeholder={t('full_name')}
              />
              <TextField
                control={form.control}
                name={`comparators.${index}.job`}
                label={t('job_role')}
                placeholder={t('role_placeholder')}
              />
              <TextField
                control={form.control}
                name={`comparators.${index}.period`}
                label={t('period')}
                placeholder={t('period_placeholder')}
              />
            </div>
            <FormField
              control={form.control}
              name={`comparators.${index}.workedTogether`}
              render={({ field }) => (
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
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
