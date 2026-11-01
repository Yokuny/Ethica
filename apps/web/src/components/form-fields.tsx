import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Textarea } from '@ethica/ui/components/textarea';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { DatePicker } from '@/components/date-picker.js';
import { MoneyInput } from '@/components/money-input.js';

// Default form fields: `FormField` + label + control + message, wired
// to react-hook-form. The screen only picks the field, the name and the texts; `placeholder`
// is required on every field (crm-web-standards → ethica-web-standards).
type BaseFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  disabled?: boolean;
};

export function TextField<T extends FieldValues>({ control, name, label, placeholder, disabled }: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} disabled={disabled} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
}: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea placeholder={placeholder} disabled={disabled} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
  items,
  onValueChange,
}: BaseFieldProps<T> & {
  items: readonly { value: string; label: string }[];
  // Extra effect besides saving the value (e.g. changing the kind clears the category).
  onValueChange?: (value: string) => void;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            items={items}
            value={field.value ?? null}
            disabled={disabled}
            onValueChange={(value) => {
              field.onChange(value ?? undefined);
              if (value) onValueChange?.(value);
            }}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
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
  );
}

// Amount in cents (integer), as it travels in the API.
export function MoneyField<T extends FieldValues>({ control, name, label, placeholder, disabled }: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <MoneyInput
              placeholder={placeholder}
              disabled={disabled}
              value={field.value ?? 0}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Calendar date `YYYY-MM-DD`.
export function DateField<T extends FieldValues>({ control, name, label, placeholder, disabled }: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <DatePicker value={field.value} onChange={field.onChange} placeholder={placeholder} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
  min,
  step,
}: BaseFieldProps<T> & { min?: number; step?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={min}
              step={step}
              placeholder={placeholder}
              disabled={disabled}
              value={field.value ?? ''}
              onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
              onBlur={field.onBlur}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Wall-clock time `HH:mm`.
export function TimeField<T extends FieldValues>({ control, name, label, placeholder, disabled }: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="time" placeholder={placeholder} disabled={disabled} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
