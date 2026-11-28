import type { CasePhase } from '@ethica/contracts';
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
import { useFormContext, useWatch } from 'react-hook-form';
import {
  CASE_PHASE_GROUP_ITEMS,
  OWN_SERVICE_PHASE_ITEMS,
  serviceTypeLabel,
  TECHNICAL_ASSISTANCE_PHASE_ITEMS,
} from '@/components/case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

// "Fase do serviço" (AD-178, AD-310): the list of the service type — the perícia one in groups, the assistance one
// and the one of partnership and private service.
export function CasePhaseField() {
  const { control } = useFormContext<CaseFormValues>();
  const serviceType = useWatch({ control, name: 'serviceType' });
  const groups: { group: string; label: string; items: readonly { value: CasePhase; label: string }[] }[] =
    serviceType === 'expert_examination'
      ? CASE_PHASE_GROUP_ITEMS
      : serviceType
        ? [
            {
              group: serviceType,
              label: serviceTypeLabel(serviceType),
              items:
                serviceType === 'technical_assistance' ? TECHNICAL_ASSISTANCE_PHASE_ITEMS : OWN_SERVICE_PHASE_ITEMS,
            },
          ]
        : [];
  const items = groups.flatMap((group) => group.items);
  return (
    <FormField
      control={control}
      name="phase"
      render={({ field }) => (
        <FormItem>
          <FormLabel required>{t('service_phase')}</FormLabel>
          <Select
            items={items}
            value={field.value ?? null}
            onValueChange={(value) => field.onChange(value ?? undefined)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('select')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {groups.map((group) => (
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
