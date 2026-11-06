import { type CaseRole, casePhases, defaultPhase } from '@ethica/contracts';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  COURT_TYPE_ITEMS,
  NEW_SERVICE_TYPE,
  OWN_TYPE_PREFIX,
  PRIVATE_SERVICE_TYPE,
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

// "Tipo de serviço" (AD-178): Perícia, Assistência técnica, the office's own types and "Cadastrar novo" (name).
// "Esfera" only in a perícia. In an own type the role is chosen or typed (AD-176). Each type drops the fields
// of the others: the sphere outside the perícia, the contractor in the perícia, the typed phase outside the own type.
// `creating` lives in the form: picking another type swaps the form layout and remounts this field.
export function ServiceTypeField({
  creating,
  onCreating,
}: {
  creating: boolean;
  onCreating: (creating: boolean) => void;
}) {
  const { control, setValue, getValues } = useFormContext<CaseFormValues>();
  const [role, serviceType, roleName] = useWatch({ control, name: ['role', 'serviceType', 'roleName'] });
  const officeTypes = useQuery(serviceTypesQuery);
  const [typingRole, setTypingRole] = useState(false);
  const items = [...serviceTypeItems(officeTypes.data ?? []), { value: NEW_SERVICE_TYPE, label: t('register_new') }];
  const value = creating ? NEW_SERVICE_TYPE : serviceTypeValue({ role, serviceType: serviceType ?? undefined });
  const roleNames = [...new Set((officeTypes.data ?? []).flatMap((item) => (item.roleName ? [item.roleName] : [])))];
  const roleItems = [...ROLE_ITEMS, ...roleNames.map((name) => ({ value: `${TYPED}${name}`, label: name }))];
  const roleValue = typingRole ? NEW_CHOICE : role === 'other' ? (roleName ? `${TYPED}${roleName}` : undefined) : role;

  const choose = (chosen: string) => {
    onCreating(chosen === NEW_SERVICE_TYPE);
    setTypingRole(false);
    if (chosen !== 'court_expert') setValue('courtType', undefined);
    if (chosen === NEW_SERVICE_TYPE || chosen.startsWith(OWN_TYPE_PREFIX)) {
      const name = chosen === NEW_SERVICE_TYPE ? '' : chosen.slice(OWN_TYPE_PREFIX.length);
      const found = officeTypes.data?.find((item) => item.name === name);
      setValue('serviceType', name, { shouldValidate: Boolean(name) });
      // "Serviço particular" starts with the role blank, to be chosen (AD-200).
      const blankRole = name === PRIVATE_SERVICE_TYPE;
      setValue('role', blankRole ? 'other' : (found?.role ?? getValues('role')));
      setValue('roleName', blankRole ? undefined : found?.roleName);
      // Own types offer only "Honorários recebidos" and the typed phases (AD-178).
      if (getValues('phase') !== 'fees_received' && getValues('phase') !== 'custom') {
        setValue('phase', 'custom');
        setValue('phaseName', found?.phases[0] ?? '');
      }
      return;
    }
    setValue('serviceType', undefined);
    setValue('roleName', undefined);
    setValue('role', chosen as CaseRole, { shouldValidate: true });
    if (chosen === 'court_expert') setValue('contractor', undefined);
    // Perícia and assistance have different lists (AD-186): a phase of the other one goes to the first of this one.
    const phase = getValues('phase');
    if (!phase || !casePhases(chosen as CaseRole).includes(phase)) {
      setValue('phase', defaultPhase({ role: chosen as CaseRole }) ?? 'awaiting_scheduling');
    }
    setValue('phaseName', undefined);
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
      {!creating && !serviceType && role === 'court_expert' && (
        <SelectField
          control={control}
          name="courtType"
          label={t('sphere')}
          placeholder={t('select')}
          items={COURT_TYPE_ITEMS}
          required
        />
      )}
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
