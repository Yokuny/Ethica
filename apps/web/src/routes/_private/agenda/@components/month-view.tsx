import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { addDaysToDisplayDate, displayWeekStartOf, startOfDisplayMonth } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { CalendarEntryRecord } from '@/query/calendar-entry.js';
import { itemOverlapsDay, shortWeekday } from '../@utils/calendar-grid.utils.js';
import { CalendarEntryChip, CalendarEventChip } from './calendar-event.js';
import { CalendarMonthCell, CalendarMonthGrid } from './calendar-grid.js';

export type MonthViewProps = {
  // Any wall-clock date inside the displayed month (YYYY-MM-DD).
  month: string;
  items: AppointmentRecord[];
  onSelect: (item: AppointmentRecord) => void;
  // All-day entries (deadlines, finance): they come first on the day.
  entries?: CalendarEntryRecord[];
  onSelectEntry?: (entry: CalendarEntryRecord) => void;
  // A click on the empty part of a day opens "new appointment" on it.
  onCreate?: (day: string) => void;
  today?: string;
};

const WEEKS_IN_GRID = 6;
const DAYS_IN_WEEK = 7;
const MAX_VISIBLE_PER_DAY = 3;

// 6x7 grid (week starting Monday, same project convention) — days
// outside the month (filling the first/last week) are faded.
export function MonthView({
  month,
  items,
  onSelect,
  entries = [],
  onSelectEntry = () => {},
  onCreate = () => {},
  today = '',
}: MonthViewProps) {
  const monthPrefix = startOfDisplayMonth(month).slice(0, 7);
  const gridStart = displayWeekStartOf(startOfDisplayMonth(month));
  const days = Array.from({ length: WEEKS_IN_GRID * DAYS_IN_WEEK }, (_, index) =>
    addDaysToDisplayDate(gridStart, index),
  );

  // Header and cells in the SAME CalendarMonthGrid: the lines all come from the primitive.
  return (
    <CalendarMonthGrid data-testid="month-view">
      {days.slice(0, DAYS_IN_WEEK).map((day) => (
        <ItemDescription key={day} className="line-clamp-none py-2.5 text-center text-xs">
          {shortWeekday(day)}
        </ItemDescription>
      ))}
      {days.map((day) => {
        // Deadlines and finance first, then the appointments by time; together they share the limit.
        const chips = [
          ...entries
            .filter((entry) => entry.date === day)
            .map((entry) => <CalendarEntryChip key={entry.id} entry={entry} today={today} onSelect={onSelectEntry} />),
          ...items
            .filter((item) => itemOverlapsDay(item, day))
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((item) => <CalendarEventChip key={item.id} item={item} onSelect={onSelect} variant="compact" />),
        ];
        const overflow = chips.length - MAX_VISIBLE_PER_DAY;

        return (
          <CalendarMonthCell
            key={day}
            data-testid={`month-view-day-${day}`}
            outside={!day.startsWith(monthPrefix)}
            onClick={() => onCreate(day)}
          >
            <ItemDescription
              className={cn(
                'line-clamp-none inline-flex size-6 items-center justify-center rounded-full text-xs',
                day === today && 'bg-primary font-semibold text-primary-foreground',
              )}
            >
              {Number(day.slice(-2))}
            </ItemDescription>
            {chips.slice(0, MAX_VISIBLE_PER_DAY)}
            {overflow > 0 && (
              <Popover>
                <PopoverTrigger
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-md px-1.5 py-0.5 text-left text-xs text-muted-foreground hover:bg-muted"
                >
                  +{overflow} {t('more')}
                </PopoverTrigger>
                <PopoverContent className="grid w-60 gap-1" onClick={(event) => event.stopPropagation()}>
                  <ItemTitle className="mb-1 text-xs">{formatDate(day)}</ItemTitle>
                  {chips}
                </PopoverContent>
              </Popover>
            )}
          </CalendarMonthCell>
        );
      })}
    </CalendarMonthGrid>
  );
}
