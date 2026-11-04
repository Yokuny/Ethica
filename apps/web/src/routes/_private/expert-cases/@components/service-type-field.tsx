import type { CaseRole, CourtType } from '@ethica/contracts';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { NEW_SERVICE_TYPE, ROLE_ITEMS, serviceTypeItems, serviceTypeValue } from '@/components/case-labels.js';
import { TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';
import { NEW_CHOICE, OpenChoiceField } from './open-choice-field.js';

const TYPED = 'typed:';

// "Tipo de serviço" (AD-158): one list for court type, role and the office's own types. "Cadastrar
// novo" asks for the name. In the office's own type the role is chosen or typed (AD-176); a judicial
// type drops the role name, the typed status and the contractor.
// `creating` lives in the form: picking an own type swaps the form layout and remounts this field.
export function ServiceTypeField({
  creating,
  onCreating,
}: {
  creating: boolean;
  onCreating: (creating: boolean) => void;
}) {
  const { control, setValue, getValues } = useFormContext<CaseFormValues>();
  const [courtType, role, serviceType, roleName] = useWatch({
    control,
    name: ['courtType', 'role', 'serviceType', 'roleName'],
  });
  const officeTypes = useQuery(serviceTypesQuery);
  const [typingRole, setTypingRole] = useState(false);
  const items = serviceTypeItems(officeTypes.data ?? []);
  const value = creating ? NEW_SERVICE_TYPE : serviceTypeValue({ courtType, role, serviceType });
  const roleNames = [...new Set((officeTypes.data ?? []).flatMap((item) => (item.roleName ? [item.roleName] : [])))];
  const roleItems = [...ROLE_ITEMS, ...roleNames.map((name) => ({ value: `${TYPED}${name}`, label: name }))];
  const roleValue = typingRole ? NEW_CHOICE : role === 'other' ? roleName && `${TYPED}${roleName}` : role;

  const toOwnType = (name: string) => {
    setValue('courtType', 'other', { shouldValidate: true });
    setValue('serviceType', name);
    // Own types offer only "Concluído", "Cancelado" and the typed statuses (AD-176).
    const status = getValues('status');
    if (status !== 'completed' && status !== 'declined' && status !== 'custom') {
      const typed = officeTypes.data?.find((item) => item.name === name)?.statuses[0];
      setValue('status', 'custom');
      setValue('statusName', typed ?? '');
    }
    const found = officeTypes.data?.find((item) => item.name === name);
    if (found) {
      setTypingRole(false);
      setValue('role', found.role);
      setValue('roleName', found.roleName);
    }
  };

  const choose = (chosen: string) => {
    onCreating(chosen === NEW_SERVICE_TYPE);
    if (chosen === NEW_SERVICE_TYPE) return toOwnType('');
    const [type, rest] = chosen.split(/:(.*)/s) as [CourtType, string];
    if (type === 'other') return toOwnType(rest);
    setTypingRole(false);
    setValue('courtType', type, { shouldValidate: true });
    setValue('serviceType', undefined);
    setValue('role', rest as CaseRole);
    setValue('roleName', undefined);
    setValue('contractor', undefined);
    if (getValues('status') === 'custom') setValue('status', 'appointed');
    setValue('statusName', undefined);
  };

  const chooseRole = (chosen: string) => {
    setTypingRole(chosen === NEW_CHOICE);
    if (chosen === NEW_CHOICE || chosen.startsWith(TYPED)) {
      setValue('role', 'other');
      setValue('roleName', chosen === NEW_CHOICE ? '' : chosen.slice(TYPED.length));
      return;
    }
    setValue('role', chosen as CaseRole);
    setValue('roleName', undefined);
  };

  return (
    <>
      <FormField
        control={control}
        name="courtType"
        render={() => (
          <FormItem>
            <FormLabel required>{t('service_type')}</FormLabel>
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
        <TextField
          control={control}
          name="serviceType"
          label={t('new_service_type_name')}
          required
          placeholder={t('example_service_type')}
        />
      )}
      {courtType === 'other' && (
        <OpenChoiceField
          name="role"
          label={t('role_in_case')}
          items={roleItems}
          value={roleValue}
          newLabel={t('register_new_role')}
          onChoose={chooseRole}
          textName="roleName"
          textLabel={t('new_role_name')}
          textPlaceholder={t('example_role')}
        />
      )}
    </>
  );
}
