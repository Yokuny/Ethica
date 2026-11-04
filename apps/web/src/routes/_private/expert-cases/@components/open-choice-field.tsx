import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useFormContext } from 'react-hook-form';
import { TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

export const NEW_CHOICE = 'new';

type OpenChoiceFieldProps = {
  name: 'role' | 'phase';
  label: string;
  items: { value: string; label: string }[];
  // `NEW_CHOICE` shows the text field.
  value?: string;
  newLabel: string;
  onChoose: (value: string) => void;
  textName: 'roleName' | 'phaseName';
  textLabel: string;
  textPlaceholder: string;
};

// Role and phase of the office's own type (AD-176, AD-178): choose one already used or type a new one; both required.
export function OpenChoiceField({
  name,
  label,
  items,
  value,
  newLabel,
  onChoose,
  textName,
  textLabel,
  textPlaceholder,
}: OpenChoiceFieldProps) {
  const { control } = useFormContext<CaseFormValues>();
  const options = [...items, { value: NEW_CHOICE, label: newLabel }];
  return (
    <>
      <FormField
        control={control}
        name={name}
        render={() => (
          <FormItem>
            <FormLabel required>{label}</FormLabel>
            <Select items={options} value={value ?? null} onValueChange={(chosen) => chosen && onChoose(chosen)}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((item) => (
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
      {value === NEW_CHOICE && (
        <TextField control={control} name={textName} label={textLabel} placeholder={textPlaceholder} required />
      )}
    </>
  );
}
