import { type CaseStatus, phaseFitsInStatus } from '@ethica/contracts';
import { type Control, useFormContext, useWatch } from 'react-hook-form';
import {
  CASE_STATUS_ITEMS,
  COURT_TYPE_ITEMS,
  phaseItems,
  ROLE_ITEMS,
  WITHOUT_PHASE,
} from '@/components/case-labels.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { DateField, MoneyField, SelectField, TextareaField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';
import { CasePartiesFields } from './case-parties-fields.js';
import { LaborCaseFields } from './labor-case-fields.js';

// Campos da perícia compartilhados por `add` e `details` (edição). Na edição
// entram também a etapa e o honorário fixado pelo juízo; o prazo do laudo só no
// cadastro (depois os prazos são editados no painel de prazos do detalhe).
export function CaseFormFields({ control, editing = false }: { control: Control<CaseFormValues>; editing?: boolean }) {
  const { getValues, setValue } = useFormContext<CaseFormValues>();
  const courtType = useWatch({ control, name: 'courtType' });
  const role = useWatch({ control, name: 'role' });
  const status = useWatch({ control, name: 'status' });
  return (
    <DefaultFormLayout
      sections={[
        {
          title: t('process'),
          description: t('process_identification_data'),
          fields: [
            <div key="process" className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="processNumber"
                label={t('process_number')}
                placeholder="0000000-00.0000.0.00.0000"
              />
              <TextField control={control} name="court" label={t('court')} placeholder={t('example_court')} />
              <SelectField
                control={control}
                name="courtType"
                label={t('court_type')}
                placeholder={t('select')}
                items={COURT_TYPE_ITEMS}
              />
              <SelectField
                control={control}
                name="role"
                label={t('role_in_case')}
                placeholder={t('select')}
                items={ROLE_ITEMS}
              />
              <TextField
                control={control}
                name="division"
                label={t('court_division')}
                placeholder={t('example_court_division')}
              />
              <TextField
                control={control}
                name="district"
                label={t('judicial_district')}
                placeholder={t('example_judicial_district')}
              />
            </div>,
          ],
        },
        {
          title: t('expert_case'),
          description: t('object_and_deadlines'),
          fields: [
            <TextField
              key="subject"
              control={control}
              name="subject"
              label={t('object')}
              placeholder={t('example_object')}
            />,
            <div key="dates" className="grid gap-4 sm:grid-cols-2">
              <DateField
                control={control}
                name="nominationDate"
                label={t('appointment_date')}
                placeholder={t('choose_day')}
              />
              {!editing && (
                <DateField
                  control={control}
                  name="reportDeadline"
                  label={t('report_deadline')}
                  placeholder={t('choose_day')}
                />
              )}
              {editing && (
                <SelectField
                  control={control}
                  name="status"
                  label={t('stage')}
                  placeholder={t('select')}
                  items={CASE_STATUS_ITEMS}
                  // A fase que não cabe na etapa nova sai (AD-133); a API recusaria a combinação.
                  onValueChange={(status) => {
                    const phase = getValues('phase');
                    if (phase && !phaseFitsInStatus(phase, status as CaseStatus)) setValue('phase', null);
                  }}
                />
              )}
              {editing && status && (
                <SelectField
                  control={control}
                  name="phase"
                  label={t('phase')}
                  placeholder={t('no_detailed_phase')}
                  items={phaseItems(status)}
                  onValueChange={(phase) => {
                    if (phase === WITHOUT_PHASE) setValue('phase', null);
                  }}
                />
              )}
            </div>,
          ],
        },
        {
          title: t('parties'),
          description: t('parties_and_lawyers_description'),
          fields: [<CasePartiesFields key="parties" />],
        },
        ...(courtType === 'labor'
          ? [
              {
                title: t('labor_report_data'),
                description: t('labor_report_data_description'),
                fields: [<LaborCaseFields key="labor" />],
              },
            ]
          : []),
        {
          title: t('fees'),
          description: t('proposed_and_fixed_fees'),
          fields: [
            <div key="fees" className="grid gap-4 sm:grid-cols-2">
              <MoneyField
                control={control}
                name="proposedFeesCents"
                label={t('proposed_fees')}
                placeholder={t('example_money')}
              />
              {editing && (
                <MoneyField
                  control={control}
                  name="fixedFeesCents"
                  // Na perícia de assistente técnico é o honorário combinado com o contratante (AD-135).
                  label={role === 'technical_assistant' ? t('contracted_fees') : t('fixed_fees')}
                  placeholder={t('example_money')}
                />
              )}
            </div>,
            <TextareaField
              key="obs"
              control={control}
              name="notes"
              label={t('notes')}
              placeholder={t('notes_placeholder')}
            />,
          ],
        },
      ]}
    />
  );
}
