import { casePhases, defaultPhase, type ServiceType } from '@ethica/contracts';
import { useFormContext, useWatch } from 'react-hook-form';
import { COURT_TYPE_ITEMS, SERVICE_TYPE_ITEMS } from '@/components/case-labels.js';
import { SelectField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

// "Tipo de serviço" (AD-310): the four fixed types; "Esfera" only in a perícia. Each type drops the fields of the
// others (the sphere outside the perícia, the contractor in it) and a phase of another list goes to the first one.
export function ServiceTypeField() {
  const { control, setValue, getValues } = useFormContext<CaseFormValues>();
  const serviceType = useWatch({ control, name: 'serviceType' });

  const choose = (chosen: string) => {
    const next = chosen as ServiceType;
    if (next === 'expert_examination') setValue('contractor', undefined);
    else setValue('courtType', undefined);
    const phase = getValues('phase');
    if (!phase || !casePhases(next).includes(phase)) setValue('phase', defaultPhase(next));
  };

  return (
    <>
      <SelectField
        control={control}
        name="serviceType"
        label={t('service_type')}
        placeholder={t('select')}
        items={SERVICE_TYPE_ITEMS}
        onValueChange={choose}
        required
      />
      {serviceType === 'expert_examination' && (
        <SelectField
          control={control}
          name="courtType"
          label={t('sphere')}
          placeholder={t('select')}
          items={COURT_TYPE_ITEMS}
          required
        />
      )}
    </>
  );
}
