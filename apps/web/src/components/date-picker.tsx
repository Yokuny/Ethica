import { Button } from '@ethica/ui/components/button';
import { Calendar } from '@ethica/ui/components/calendar';
import { ItemDescription } from '@ethica/ui/components/item';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { Calendar as IconCalendar } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';

type DatePickerProps = {
  // Calendar date `YYYY-MM-DD` (display time zone), as it travels in the API.
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  disabled?: boolean;
  id?: string;
};

const toDate = (value: string): Date => new Date(`${value}T12:00:00`);
const toCalendarDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Controlled date field for forms (`FormControl` + react-hook-form).
export function DatePicker({ value, onChange, placeholder, disabled, id }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            size="field"
            disabled={disabled}
            className="w-full justify-start font-normal"
          >
            <IconCalendar className="size-4" />
            <ItemDescription className="text-inherit line-clamp-none">
              {value ? formatDate(toDate(value)) : placeholder}
            </ItemDescription>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ? toDate(value) : undefined}
          onSelect={(date) => {
            onChange(date ? toCalendarDate(date) : undefined);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
