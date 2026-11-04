import { type CasePhase, isOwnType, OWN_TYPE_PHASES } from '@ethica/contracts';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CASE_PHASE_GROUP_ITEMS, CASE_PHASE_ITEMS, casePhaseLabel } from '@/components/case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceTypesQuery } from '@/query/case.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';
import { NEW_CHOICE, OpenChoiceField } from './open-choice-field.js';

const TYPED = 'typed:';

// "Fase do serviço" (AD-178): the routine list in groups in Perícia and Assistência técnica; in the office's
// own type, the phases already typed in it, "Honorários recebidos" or a new one. A saved phase stays listed.
export function CasePhaseField({ creating }: { creating: boolean }) {
  const { control, setValue } = useFormContext<CaseFormValues>();
  const [serviceType, phase, phaseName] = useWatch({ control, name: ['serviceType', 'phase', 'phaseName'] });
  const officeTypes = useQuery(serviceTypesQuery);
  const [typing, setTyping] = useState(false);

  if (!isOwnType({ serviceType }) && !creating) {
    return (
      <FormField
        control={control}
        name="phase"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>{t('service_phase')}</FormLabel>
            <Select
              items={CASE_PHASE_ITEMS}
              value={field.value ?? null}
              onValueChange={(value) => field.onChange(value ?? undefined)}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CASE_PHASE_GROUP_ITEMS.map((group) => (
                  <SelectGroup key={group.group}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  const used = officeTypes.data?.find((item) => item.name === serviceType)?.phases ?? [];
  const fixed: CasePhase[] = [...OWN_TYPE_PHASES];
  if (phase && phase !== 'custom' && !fixed.includes(phase)) fixed.push(phase);
  const items = [
    ...used.map((name) => ({ value: `${TYPED}${name}`, label: name })),
    ...fixed.map((value) => ({ value, label: casePhaseLabel(value) })),
  ];
  // Empty typed phase (new type without phases yet) opens the text field.
  const value =
    typing || (phase === 'custom' && !used.includes(phaseName ?? ''))
      ? NEW_CHOICE
      : phase === 'custom'
        ? `${TYPED}${phaseName}`
        : phase;

  const choose = (chosen: string) => {
    setTyping(chosen === NEW_CHOICE);
    if (chosen === NEW_CHOICE || chosen.startsWith(TYPED)) {
      setValue('phase', 'custom');
      setValue('phaseName', chosen === NEW_CHOICE ? '' : chosen.slice(TYPED.length));
      return;
    }
    setValue('phase', chosen as CasePhase);
    setValue('phaseName', undefined);
  };

  return (
    <OpenChoiceField
      name="phase"
      label={t('service_phase')}
      items={items}
      value={value}
      newLabel={t('register_new_phase')}
      onChoose={choose}
      textName="phaseName"
      textLabel={t('new_phase_name')}
      textPlaceholder={t('example_phase')}
    />
  );
}
