import { Button } from '@ethica/ui/components/button';
import { Calendar } from '@ethica/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { CalendarRange } from 'lucide-react';
import { useState } from 'react';
import { toCalendarDate } from '@/components/date-picker.js';
import {
  addDaysToDisplayDate,
  daysInDisplayMonth,
  displayWeekStartOf,
  startOfDisplayMonth,
} from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { rangeLabel, rangeOf } from '../@utils/range.js';

type RangePickerProps = {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
};

const toDate = (value: string): Date => new Date(`${value}T12:00:00`);

// Header calendar of the logistics pages (AD-242), for what `DayStrip` does not show: month and year in lists, the
// first click is the start and the second the end, and the whole week or month of the first selected day.
export function RangePicker({ from, to, onChange }: RangePickerProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string>();
  const year = new Date().getFullYear();
  const week = displayWeekStartOf(from);
  const month = startOfDisplayMonth(from);

  function choose(range: { from: string; to: string }) {
    onChange(range);
    setStart(undefined);
    setOpen(false);
  }

  function pick(day: Date) {
    const picked = toCalendarDate(day);
    if (!start) return setStart(picked);
    choose(rangeOf(start, picked));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setStart(undefined);
      }}
    >
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" aria-label={t('date_range')}>
            <CalendarRange />
            {rangeLabel(from, to)}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          captionLayout="dropdown"
          startMonth={new Date(year - 5, 0)}
          endMonth={new Date(year + 5, 11)}
          defaultMonth={toDate(from)}
          selected={start ? { from: toDate(start), to: undefined } : { from: toDate(from), to: toDate(to) }}
          onSelect={(_range, day) => pick(day)}
        />
        <div className="flex gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => choose({ from: week, to: addDaysToDisplayDate(week, 6) })}
          >
            {t('week')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => choose({ from: month, to: addDaysToDisplayDate(month, daysInDisplayMonth(month) - 1) })}
          >
            {t('month')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
