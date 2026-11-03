import type { CaseRole, CourtType } from '@ethica/contracts';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { NEW_SERVICE_TYPE, ROLE_ITEMS, serviceTypeItems, serviceTypeValue } from '@/components/case-labels.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

// "Tipo de serviço" (AD-158): one list for court type, role and the office's own types. "Cadastrar
// novo" asks for the name and the role; the type exists once a service uses it.
export function ServiceTypeField() {
  const { control, setValue } = useFormContext<CaseFormValues>();
  const [courtType, role, serviceType] = useWatch({ control, name: ['courtType', 'role', 'serviceType'] });
  const officeTypes = useQuery(serviceTypesQuery);
  const [creating, setCreating] = useState(false);
  const items = serviceTypeItems(officeTypes.data ?? []);
  const value = creating ? NEW_SERVICE_TYPE : serviceTypeValue({ courtType, role, serviceType });

  const choose = (chosen: string) => {
    setCreating(chosen === NEW_SERVICE_TYPE);
    if (chosen === NEW_SERVICE_TYPE) {
      setValue('courtType', 'other');
      setValue('serviceType', '');
      return;
    }
    const [type, rest] = chosen.split(/:(.*)/s) as [CourtType, string];
    setValue('courtType', type, { shouldValidate: true });
    if (type === 'other') {
      setValue('serviceType', rest);
      const officeRole = officeTypes.data?.find((item) => item.name === rest)?.role;
      if (officeRole) setValue('role', officeRole);
    } else {
      setValue('serviceType', undefined);
      setValue('role', rest as CaseRole);
    }
  };

  return (
    <>
      <FormField
        control={control}
        name="courtType"
        render={() => (
          <FormItem>
            <FormLabel>{t('service_type')}</FormLabel>
            <Select items={items} value={value ?? null} onValueChange={(chosen) => chosen && choose(chosen)}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {creating && (
        <>
          <TextField
            control={control}
            name="serviceType"
            label={t('new_service_type_name')}
            placeholder={t('example_service_type')}
          />
          <SelectField
            control={control}
            name="role"
            label={t('role_in_case')}
            placeholder={t('select')}
            items={ROLE_ITEMS}
          />
        </>
      )}
    </>
  );
}
