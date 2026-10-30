import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Textarea } from '@ethica/ui/components/textarea';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { DatePicker } from '@/components/date-picker.js';
import { MoneyInput } from '@/components/money-input.js';

// Campos de formulário padrão: `FormField` + rótulo + controle + mensagem, ligados
// ao react-hook-form. A tela só escolhe o campo, o nome e os textos; `placeholder`
// é obrigatório em todo campo (crm-web-standards → ethica-web-standards).
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
  // Efeito extra além de gravar o valor (ex.: trocar a natureza limpa a categoria).
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

// Valor em centavos (inteiro), como trafega na API.
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

// Data de calendário `YYYY-MM-DD`.
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

// Hora de parede `HH:mm`.
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
