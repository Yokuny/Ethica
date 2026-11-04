import type { CaseStatus } from '@ethica/contracts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CASE_STATUS_ITEMS, caseStatusLabel } from '@/components/case-labels.js';
import { SelectField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';
import { NEW_CHOICE, OpenChoiceField } from './open-choice-field.js';

const TYPED = 'typed:';

// Service status: the routine list in the judicial types; in the office's own type, the statuses
// already typed in it, "Concluído", "Cancelado" or a new one (AD-176). A service saved before keeps its status.
export function CaseStatusField() {
  const { control, setValue } = useFormContext<CaseFormValues>();
  const [courtType, serviceType, status, statusName] = useWatch({
    control,
    name: ['courtType', 'serviceType', 'status', 'statusName'],
  });
  const officeTypes = useQuery(serviceTypesQuery);
  const [typing, setTyping] = useState(false);

  if (courtType !== 'other') {
    return (
      <SelectField
        control={control}
        name="status"
        label={t('service_status')}
        placeholder={t('select')}
        items={CASE_STATUS_ITEMS}
      />
    );
  }

  const used = officeTypes.data?.find((item) => item.name === serviceType)?.statuses ?? [];
  const fixed: CaseStatus[] = ['completed', 'declined'];
  if (status && status !== 'custom' && !fixed.includes(status)) fixed.push(status);
  const items = [
    ...used.map((name) => ({ value: `${TYPED}${name}`, label: name })),
    ...fixed.map((value) => ({ value, label: caseStatusLabel(value) })),
  ];
  // Empty typed status (new type without statuses yet) opens the text field.
  const value =
    typing || (status === 'custom' && !used.includes(statusName ?? ''))
      ? NEW_CHOICE
      : status === 'custom'
        ? `${TYPED}${statusName}`
        : status;

  const choose = (chosen: string) => {
    setTyping(chosen === NEW_CHOICE);
    if (chosen === NEW_CHOICE || chosen.startsWith(TYPED)) {
      setValue('status', 'custom');
      setValue('statusName', chosen === NEW_CHOICE ? '' : chosen.slice(TYPED.length));
      return;
    }
    setValue('status', chosen as CaseStatus);
    setValue('statusName', undefined);
  };

  return (
    <OpenChoiceField
      name="status"
      label={t('service_status')}
      items={items}
      value={value}
      newLabel={t('register_new_status')}
      onChoose={choose}
      textName="statusName"
      textLabel={t('new_status_name')}
      textPlaceholder={t('example_status')}
    />
  );
}
