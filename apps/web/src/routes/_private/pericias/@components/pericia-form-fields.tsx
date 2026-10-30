import type { UpdatePericia } from '@ethica/contracts';
import type { Control } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { DateField, MoneyField, SelectField, TextareaField, TextField } from '@/components/form-fields.js';
import { JUSTICA_ITEMS, PAPEL_ITEMS, PERICIA_STATUS_ITEMS } from '@/components/pericia-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Campos da perícia compartilhados por `add` e `details` (edição). Na edição
// entram também a etapa e o honorário fixado pelo juízo.
export function PericiaFormFields({
  control,
  editing = false,
}: {
  control: Control<UpdatePericia>;
  editing?: boolean;
}) {
  return (
    <DefaultFormLayout
      sections={[
        {
          title: t('process'),
          description: t('process_identification_data'),
          fields: [
            <div key="processo" className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="numeroProcesso"
                label={t('process_number')}
                placeholder="0000000-00.0000.0.00.0000"
              />
              <TextField control={control} name="tribunal" label={t('tribunal')} placeholder={t('example_tribunal')} />
              <SelectField
                control={control}
                name="justica"
                label={t('court_type')}
                placeholder={t('select')}
                items={JUSTICA_ITEMS}
              />
              <SelectField
                control={control}
                name="papel"
                label={t('role_in_case')}
                placeholder={t('select')}
                items={PAPEL_ITEMS}
              />
              <TextField control={control} name="vara" label={t('vara')} placeholder={t('example_vara')} />
              <TextField control={control} name="comarca" label={t('comarca')} placeholder={t('example_comarca')} />
            </div>,
          ],
        },
        {
          title: t('pericia'),
          description: t('object_parties_and_deadlines'),
          fields: [
            <TextField
              key="objeto"
              control={control}
              name="objeto"
              label={t('object')}
              placeholder={t('example_object')}
            />,
            <div key="partes" className="grid gap-4 sm:grid-cols-2">
              <TextField control={control} name="autor" label={t('plaintiff')} placeholder={t('example_name')} />
              <TextField control={control} name="reu" label={t('defendant')} placeholder={t('example_company')} />
              <DateField
                control={control}
                name="dataNomeacao"
                label={t('appointment_date')}
                placeholder={t('choose_day')}
              />
              <DateField
                control={control}
                name="prazoLaudo"
                label={t('report_deadline')}
                placeholder={t('choose_day')}
              />
              {editing && (
                <SelectField
                  control={control}
                  name="status"
                  label={t('stage')}
                  placeholder={t('select')}
                  items={PERICIA_STATUS_ITEMS}
                />
              )}
            </div>,
          ],
        },
        {
          title: t('fees'),
          description: t('proposed_and_fixed_fees'),
          fields: [
            <div key="honorarios" className="grid gap-4 sm:grid-cols-2">
              <MoneyField
                control={control}
                name="honorariosPropostosCents"
                label={t('proposed_fees')}
                placeholder={t('example_money')}
              />
              {editing && (
                <MoneyField
                  control={control}
                  name="honorariosFixadosCents"
                  label={t('fixed_fees')}
                  placeholder={t('example_money')}
                />
              )}
            </div>,
            <TextareaField
              key="obs"
              control={control}
              name="observacoes"
              label={t('notes')}
              placeholder={t('notes_placeholder')}
            />,
          ],
        },
      ]}
    />
  );
}
