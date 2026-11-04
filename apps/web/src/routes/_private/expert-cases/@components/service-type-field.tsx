import type { CaseRole } from '@ethica/contracts';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  COURT_TYPE_ITEMS,
  JUDICIAL_COURT_TYPE_ITEMS,
  NEW_SERVICE_TYPE,
  OWN_TYPE_PREFIX,
  ROLE_ITEMS,
  serviceTypeItems,
  serviceTypeValue,
} from '@/components/case-labels.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';
import { NEW_CHOICE, OpenChoiceField } from './open-choice-field.js';

const TYPED = 'typed:';

// "Esfera" and "Tipo de serviço" (AD-177): Perícia, Assistência técnica, Parceria, the office's own types
// and "Cadastrar novo" (name). In an own type the role is chosen or typed (AD-176). A judicial type drops
// the own type's fields and is in one of the three courts.
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
  const judicial = !creating && !serviceType && role !== 'partnership';
  const items = [...serviceTypeItems(officeTypes.data ?? []), { value: NEW_SERVICE_TYPE, label: t('register_new') }];
  const value = creating ? NEW_SERVICE_TYPE : serviceTypeValue({ role, serviceType: serviceType ?? undefined });
  const roleNames = [...new Set((officeTypes.data ?? []).flatMap((item) => (item.roleName ? [item.roleName] : [])))];
  const roleItems = [...ROLE_ITEMS, ...roleNames.map((name) => ({ value: `${TYPED}${name}`, label: name }))];
  const roleValue = typingRole ? NEW_CHOICE : role === 'other' ? (roleName ? `${TYPED}${roleName}` : undefined) : role;

  // Own types offer only "Concluído", "Cancelado" and the typed statuses (AD-176).
  const toOwnStatus = (name?: string) => {
    const status = getValues('status');
    if (status === 'completed' || status === 'declined' || status === 'custom') return;
    setValue('status', 'custom');
    setValue('statusName', officeTypes.data?.find((item) => item.name === name)?.statuses[0] ?? '');
  };

  const choose = (chosen: string) => {
    onCreating(chosen === NEW_SERVICE_TYPE);
    setTypingRole(false);
    if (chosen === NEW_SERVICE_TYPE || chosen.startsWith(OWN_TYPE_PREFIX)) {
      const name = chosen === NEW_SERVICE_TYPE ? '' : chosen.slice(OWN_TYPE_PREFIX.length);
      const found = officeTypes.data?.find((item) => item.name === name);
      setValue('serviceType', name, { shouldValidate: Boolean(name) });
      setValue('role', found?.role ?? (getValues('role') === 'partnership' ? 'court_expert' : getValues('role')));
      setValue('roleName', found?.roleName);
      return toOwnStatus(name);
    }
    setValue('serviceType', undefined);
    setValue('roleName', undefined);
    setValue('role', chosen as CaseRole, { shouldValidate: true });
    if (chosen === 'partnership') return toOwnStatus();
    setValue('contractor', undefined);
    if (getValues('status') === 'custom') setValue('status', 'appointed');
    setValue('statusName', undefined);
    if (courtType === 'extrajudicial') setValue('courtType', undefined as unknown as CaseFormValues['courtType']);
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
      <SelectField
        control={control}
        name="courtType"
        label={t('sphere')}
        placeholder={t('select')}
        items={judicial ? JUDICIAL_COURT_TYPE_ITEMS : COURT_TYPE_ITEMS}
        required
      />
      <FormField
        control={control}
        name="serviceType"
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
            {!creating && <FormMessage />}
          </FormItem>
        )}
      />
      {creating && (
        <TextField
          control={control}
          name="serviceType"
          label={t('new_service_type_name')}
          placeholder={t('example_service_type')}
          required
        />
      )}
      {(creating || serviceType) && (
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
