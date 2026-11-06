import { usesContractor } from '@ethica/contracts';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { CASE_STATUS_ITEMS } from '@/components/case-labels.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { DateField, MoneyField, SelectField, TextareaField, TextField, TimeField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';
import { CasePartiesFields } from './case-parties-fields.js';
import { CasePaymentFields } from './case-payment-fields.js';
import { CasePhaseField } from './case-phase-field.js';
import { ServiceTypeField } from './service-type-field.js';

// Case fields shared by `add` and `details` (edit). Editing also includes the fee fixed by the court;
// the report deadline only at registration (afterwards it is edited in the deadlines panel).
// The office's own type (AD-176) and the technical assistance (AD-178) swap the process for the contractor and
// drop the perícia date, the parties and the proposed fee; the contracted fee and its payment come already at
// registration.
export function CaseFormFields({
  control,
  attachments,
  editing = false,
}: {
  control: Control<CaseFormValues>;
  // The attachments field, right below the notes (SPA-03).
  attachments: ReactNode;
  editing?: boolean;
}) {
  const role = useWatch({ control, name: 'role' });
  const session = useQuery(sessionQuery).data;
  const serviceType = useWatch({ control, name: 'serviceType' });
  const [creatingType, setCreatingType] = useState(false);
  const own = creatingType || usesContractor({ serviceType, role });
  const serviceFields = (
    <div key="service" className="grid gap-4 sm:grid-cols-2">
      <ServiceTypeField creating={creatingType} onCreating={setCreatingType} />
      <TextField
        control={control}
        name="serviceOrder"
        label={t('service_order')}
        placeholder={t('service_order_automatic')}
      />
      <CasePhaseField creating={creatingType} />
      <SelectField
        control={control}
        name="status"
        label={t('status')}
        placeholder={t('select')}
        items={CASE_STATUS_ITEMS}
        required
      />
      <div className="sm:col-span-2">
        <TextField
          control={control}
          name="folderUrl"
          label={t('folder_link')}
          placeholder={t('folder_link_placeholder')}
        />
      </div>
    </div>
  );
  const contractedFee = (
    <MoneyField
      key="contracted"
      control={control}
      name="fixedFeesCents"
      label={t('contracted_fees')}
      placeholder={t('example_money')}
    />
  );
  const notes = (
    <TextareaField key="obs" control={control} name="notes" label={t('notes')} placeholder={t('notes_placeholder')} />
  );
  const dates = (
    <div key="dates" className="grid gap-4 sm:grid-cols-2">
      <DateField
        control={control}
        name="nominationDate"
        label={own ? t('contracting_date') : t('appointment_date')}
        placeholder={t('choose_day')}
        required={!own}
      />
      {!editing && (
        <DateField
          control={control}
          name="reportDeadline"
          label={own ? t('delivery_date') : t('report_deadline')}
          placeholder={t('choose_day')}
        />
      )}
    </div>
  );
  const subject = (
    <TextField
      key="subject"
      control={control}
      name="subject"
      label={t('object')}
      placeholder={t('example_object')}
      required
    />
  );

  if (own) {
    return (
      <DefaultFormLayout
        sections={[
          { title: t('expert_case'), fields: [serviceFields] },
          {
            title: t('contractor_data'),
            description: t('contractor_data_description'),
            fields: [
              <TextField
                key="contractor-name"
                control={control}
                name="contractor.name"
                label={t('name_or_company_name')}
                placeholder={t('name_or_company_name')}
                required
              />,
              <div key="contractor" className="grid gap-4 sm:grid-cols-2">
                <TextField
                  control={control}
                  name="contractor.document"
                  label={t('cpf_cnpj')}
                  placeholder={t('cpf_cnpj')}
                />
                <TextField control={control} name="contractor.phone" label={t('phone')} placeholder="(11) 90000-0000" />
                <TextField
                  control={control}
                  name="contractor.email"
                  label={t('email')}
                  placeholder={t('example_email')}
                />
                <TextField
                  control={control}
                  name="contractor.address"
                  label={t('address')}
                  placeholder={t('address')}
                />
              </div>,
            ],
          },
          { title: t('expert_case'), description: t('object_and_deadlines'), fields: [subject, dates] },
          {
            title: t('fees'),
            fields: [
              contractedFee,
              ...(!editing && session && can(session, 'finance', 'create')
                ? [<CasePaymentFields key="payment" />]
                : []),
              notes,
              attachments,
            ],
          },
        ]}
      />
    );
  }

  return (
    <DefaultFormLayout
      sections={[
        {
          title: t('process'),
          description: t('process_identification_data'),
          fields: [
            serviceFields,
            <div key="process" className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="processNumber"
                label={t('process_number')}
                placeholder="0000000-00.0000.0.00.0000"
                required
              />
              <TextField control={control} name="court" label={t('court')} placeholder={t('example_court')} required />
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
          fields: [subject, dates],
        },
        {
          title: t('inspection_date_time'),
          // Editing moves the perícia on the agenda (AEV-04); blank leaves it as it is.
          description: editing ? t('inspection_date_edit_description') : t('inspection_date_description'),
          fields: [
            <div key="inspection" className="grid gap-4 sm:grid-cols-2">
              <DateField control={control} name="inspection.date" label={t('date')} placeholder={t('choose_day')} />
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
        {
          title: t('parties'),
          description: t('parties_and_lawyers_description'),
          fields: [<CasePartiesFields key="parties" />],
        },
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
                  label={t('fixed_fees')}
                  placeholder={t('example_money')}
                />
              )}
            </div>,
            notes,
            attachments,
          ],
        },
      ]}
    />
  );
}
