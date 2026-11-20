import { Button } from '@ethica/ui/components/button';
import { Calendar } from '@ethica/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { addDaysToDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { RANGE_MAX_DAYS, rangeDays, rangeLabel, shiftRange } from '../@utils/range.js';

type RangeNavProps = {
  from: string;
  to: string;
  onChange: (range: { from?: string; to?: string }) => void;
};

const toDate = (value: string): Date => new Date(`${value}T12:00:00`);
const toCalendarDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Date range of the logistics pages (AD-239), in the frame of `PeriodNav` (AD-194): previous and next move by the
// size of the range; the middle opens the calendar, where the first click is the start and the second the end.
export function RangeNav({ from, to, onChange }: RangeNavProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string>();
  const today = new Date();

  function pick(day: Date) {
    const picked = toCalendarDate(day);
    if (!start) return setStart(picked);
    const [first, last] = [start, picked].sort() as [string, string];
    const end = rangeDays(first, last) > RANGE_MAX_DAYS ? addDaysToDisplayDate(first, RANGE_MAX_DAYS - 1) : last;
    onChange({ from: first, to: end });
    setStart(undefined);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset brings form styles; same div+role="group" as ButtonGroup. */}
      <div role="group" className="inline-flex w-fit items-center rounded-md border border-input bg-card shadow-xs">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('previous')}
          title={t('previous')}
          onClick={() => onChange(shiftRange(from, to, -1))}
        >
          <ChevronLeft />
        </Button>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            setStart(undefined);
          }}
        >
          <PopoverTrigger
            render={
              <Button type="button" variant="ghost" aria-label={t('date_range')}>
                <CalendarRange />
                {rangeLabel(from, to)}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              defaultMonth={toDate(from)}
              selected={start ? { from: toDate(start), to: undefined } : { from: toDate(from), to: toDate(to) }}
              onSelect={(_range, day) => pick(day)}
            />
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('next')}
          title={t('next')}
          onClick={() => onChange(shiftRange(from, to, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={from === to && from === toCalendarDate(today)}
        onClick={() => onChange({ from: undefined, to: undefined })}
      >
        {t('today')}
      </Button>
    </div>
  );
}
