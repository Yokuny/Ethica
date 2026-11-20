import { Button } from '@ethica/ui/components/button';
import { cn } from '@ethica/ui/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  addDaysToDisplayDate,
  formatDisplayDate,
  weekdayIndexOfDisplayDate,
} from '@/lib/helpers/displayTime.helper.js';
import { formatDate, formatShortMonth, formatShortWeekday } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { RANGE_MAX_DAYS, rangeDays } from '../@utils/range.js';

type DayStripProps = {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
};

const DAYS = 21;

// Days side by side (month, day and weekday; weekends shaded) on every logistics page (AD-242): a click picks that
// day; a click on another day right after closes the range (up to 366 days, AD-208). The days stretch over the whole
// width; the arrows move them by their count without changing the selection.
export function DayStrip({ from, to, onChange }: DayStripProps) {
  const [first, setFirst] = useState(from);
  const [anchor, setAnchor] = useState<string>();
  const today = formatDisplayDate(new Date());
  const days = Array.from({ length: DAYS }, (_, index) => addDaysToDisplayDate(first, index));

  function pick(day: string) {
    if (!anchor || anchor === day) {
      setAnchor(day);
      return onChange({ from: day, to: day });
    }
    const [start, last] = [anchor, day].sort() as [string, string];
    const end = rangeDays(start, last) > RANGE_MAX_DAYS ? addDaysToDisplayDate(start, RANGE_MAX_DAYS - 1) : last;
    setAnchor(undefined);
    onChange({ from: start, to: end });
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-lg border bg-card p-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('previous')}
        title={t('previous')}
        onClick={() => setFirst(addDaysToDisplayDate(first, -DAYS))}
      >
        <ChevronLeft />
      </Button>
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {days.map((day) => {
          const edge = day === from || day === to;
          const inside = day > from && day < to;
          const range = from !== to;
          const weekend = [0, 6].includes(weekdayIndexOfDisplayDate(day));
          const muted = edge ? 'text-primary-foreground/70' : 'text-muted-foreground';
          return (
            <Button
              key={day}
              type="button"
              variant={edge ? 'default' : 'ghost'}
              aria-label={formatDate(day)}
              aria-pressed={edge || inside}
              aria-current={day === today ? 'date' : undefined}
              className={cn(
                'h-auto min-w-10 flex-1 flex-col gap-0 px-1 py-1.5',
                inside && 'rounded-none bg-primary/15 hover:bg-primary/25',
                range && day === from && 'rounded-r-none',
                range && day === to && 'rounded-l-none',
                weekend && !edge && !inside && 'bg-muted/60 text-muted-foreground',
                day === today && !edge && 'border-border',
              )}
              onClick={() => pick(day)}
            >
              <span className={cn('text-[10px] font-medium', muted)}>{formatShortMonth(day)}</span>
              <span className="text-sm font-semibold tabular-nums">{day.slice(-2)}</span>
              <span className={cn('text-[10px] font-medium', muted)}>{formatShortWeekday(day)}</span>
            </Button>
          );
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('next')}
        title={t('next')}
        onClick={() => setFirst(addDaysToDisplayDate(first, DAYS))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
