import { type CaseStatus, phaseFitsInStatus } from '@ethica/contracts';
import { type Control, useFormContext, useWatch } from 'react-hook-form';
import { CASE_STATUS_ITEMS, phaseItems, SERVICE_STATUS_ITEMS, WITHOUT_PHASE } from '@/components/case-labels.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { DateField, MoneyField, SelectField, TextareaField, TextField, TimeField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';
import { CasePartiesFields } from './case-parties-fields.js';
import { LaborCaseFields } from './labor-case-fields.js';
import { ServiceTypeField } from './service-type-field.js';

// Case fields shared by `add` and `details` (edit). Editing
// also includes the stage and the fee fixed by the court; the report deadline and the perícia date
// only at registration (afterwards they are edited in the deadlines panel and on the agenda).
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
            <div key="service" className="grid gap-4 sm:grid-cols-2">
              <ServiceTypeField />
              <TextField
                control={control}
                name="serviceOrder"
                label={t('service_order')}
                placeholder={t('service_order_automatic')}
              />
              <SelectField
                control={control}
                name="serviceStatus"
                label={t('service_status')}
                placeholder={t('select')}
                items={SERVICE_STATUS_ITEMS}
              />
            </div>,
            <div key="process" className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="processNumber"
                label={t('process_number')}
                placeholder={courtType === 'other' ? t('optional_without_process') : '0000000-00.0000.0.00.0000'}
              />
              <TextField control={control} name="court" label={t('court')} placeholder={t('example_court')} />
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
                  // A phase that does not fit the new status is dropped (AD-133); the API would reject the combination.
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
        ...(editing
          ? []
          : [
              {
                title: t('inspection_date_time'),
                description: t('inspection_date_description'),
                fields: [
                  <div key="inspection" className="grid gap-4 sm:grid-cols-2">
                    <DateField
                      control={control}
                      name="inspection.date"
                      label={t('date')}
                      placeholder={t('choose_day')}
                    />
                    <TimeField control={control} name="inspection.time" label={t('time')} placeholder="09:00" />
                  </div>,
                  <TextField
                    key="inspection-location"
                    control={control}
                    name="inspection.location"
                    label={t('inspection_location')}
                    placeholder={t('address_or_coordinates')}
                  />,
                ],
              },
            ]),
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
                  // In a technical assistant case it is the fee agreed with the client (AD-135).
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
