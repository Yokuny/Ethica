import { DISPLAY_TIMEZONE } from '@ethica/contracts';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ScrollArea } from '@ethica/ui/components/scroll-area';
import { Time12h } from '@/components/time12h.js';
import { formatDisplayTime, weekdayIndexOfDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { CalendarEntryRecord } from '@/query/calendar-entry.js';
import { computePositionedItems, HOUR_HEIGHT_PX, HOURS_IN_DAY, shortWeekday } from '../@utils/calendar-grid.utils.js';
import { CalendarEntryChip, CalendarEventChip } from './calendar-event.js';
import {
  CalendarTimeGrid,
  CalendarTimeGridColumns,
  CalendarTimeGridHeader,
  CalendarTimeGridHourLine,
} from './calendar-grid.js';

export type TimeGridViewProps = {
  // Wall-clock dates (YYYY-MM-DD, display time zone) of the columns — 1 element
  // for the day view, 7 for the week view; the same component for both.
  days: string[];
  items: AppointmentRecord[];
  onSelect: (item: AppointmentRecord) => void;
  // All-day entries (deadlines, finance): "all day" strip under the header.
  entries?: CalendarEntryRecord[];
  onSelectEntry?: (entry: CalendarEntryRecord) => void;
  // A click on the empty part of a day opens "new appointment" on it.
  onCreate?: (day: string) => void;
  today?: string;
};

// The grid starts at 6h, or earlier when an appointment of the period starts before it.
const FIRST_HOUR = 6;
const RULER_WIDTH = 'w-14';
// "GMT-3" over the hours ruler: the times are always in the display time zone (AD-036).
const zoneLabel =
  new Intl.DateTimeFormat('en-US', { timeZone: DISPLAY_TIMEZONE, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value ?? '';

// Time overlap stacks in a cascade (see computePositionedItems): the first item of a cluster
// takes the whole column, each one after it shifts a bit to the right — never 1/N slivers.
const overlapStyle = (column: number) => ({
  left: `calc(${column * 10}% + 1px)`,
  width: `calc(${column === 0 ? 100 : 90}% - 2px)`,
  zIndex: 10 + column,
});

const minutesOfDay = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
};

// Hour grid with events positioned by time/duration (calendar-grid.utils.ts). Frame and lines
// come from the primitive (calendar-grid.tsx) — here only composition and position.
export function TimeGridView({
  days,
  items,
  onSelect,
  entries = [],
  onSelectEntry = () => {},
  onCreate = () => {},
  today = '',
}: TimeGridViewProps) {
  const positionedByDay = days.map((day) => computePositionedItems(items, day));
  const firstHour = Math.min(FIRST_HOUR, ...positionedByDay.flat().map(({ top }) => Math.floor(top / HOUR_HEIGHT_PX)));
  const hours = Array.from({ length: HOURS_IN_DAY - firstHour }, (_, index) => firstHour + index);
  const offset = firstHour * HOUR_HEIGHT_PX;
  const nowTop = (minutesOfDay(formatDisplayTime(new Date())) / 60) * HOUR_HEIGHT_PX - offset;
  const hasEntries = entries.some((entry) => days.includes(entry.date));
  const columns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };
  const isWeekend = (day: string) => [0, 6].includes(weekdayIndexOfDisplayDate(day));

  return (
    <CalendarTimeGrid className="min-w-160 flex-col" data-testid="time-grid-view">
      {/* Fixed header (outside the ScrollArea): time zone over the ruler + each day. */}
      <div className="flex">
        <div className={cn(RULER_WIDTH, 'shrink-0')}>
          <CalendarTimeGridHeader>
            <ItemDescription className="line-clamp-none text-[10px]">{zoneLabel}</ItemDescription>
          </CalendarTimeGridHeader>
        </div>
        <CalendarTimeGridColumns style={columns}>
          {days.map((day) => (
            <CalendarTimeGridHeader key={day}>
              <ItemDescription className={cn('line-clamp-none text-xs', day === today && 'text-impact')}>
                {shortWeekday(day)}
              </ItemDescription>
              <ItemTitle
                className={cn(
                  'size-7 justify-center rounded-full text-xs',
                  day === today && 'bg-primary text-primary-foreground',
                )}
              >
                {Number(day.slice(-2))}
              </ItemTitle>
            </CalendarTimeGridHeader>
          ))}
        </CalendarTimeGridColumns>
      </div>
      {hasEntries && (
        <div className="flex border-b border-border/70 bg-muted/40" data-testid="time-grid-all-day">
          <ItemDescription
            className={cn(RULER_WIDTH, 'line-clamp-none shrink-0 self-center pr-2 text-right text-[10px]')}
          >
            {t('all_day')}
          </ItemDescription>
          <CalendarTimeGridColumns style={columns}>
            {days.map((day) => (
              <div key={day} className="grid min-w-0 content-start gap-0.5 p-0.5">
                {entries
                  .filter((entry) => entry.date === day)
                  .map((entry) => (
                    <CalendarEntryChip key={entry.id} entry={entry} today={today} onSelect={onSelectEntry} />
                  ))}
              </div>
            ))}
          </CalendarTimeGridColumns>
        </div>
      )}
      {/* The body takes the screen height and scrolls under the fixed header. */}
      <ScrollArea className="h-[calc(100svh-17rem)] min-h-96">
        <div className="flex">
          <div className={cn(RULER_WIDTH, 'shrink-0')}>
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT_PX }}>
                {/* On its line; the first hour goes just under the header line. */}
                <ItemDescription
                  className={cn(
                    'absolute right-2 line-clamp-none text-[11px]',
                    hour === firstHour ? 'top-1' : '-top-2.5',
                  )}
                >
                  <Time12h value={`${String(hour).padStart(2, '0')}:00`} />
                </ItemDescription>
              </div>
            ))}
          </div>
          <CalendarTimeGridColumns style={columns}>
            {days.map((day, index) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: mouse shortcut; the keyboard uses "Novo compromisso".
              <div
                key={day}
                data-testid={`time-grid-day-${day}`}
                className={cn('relative cursor-pointer', isWeekend(day) && 'bg-muted/40')}
                style={{ height: hours.length * HOUR_HEIGHT_PX }}
                onClick={() => onCreate(day)}
              >
                {hours.slice(1).map((hour) => (
                  <CalendarTimeGridHourLine key={hour} style={{ top: (hour - firstHour) * HOUR_HEIGHT_PX }} />
                ))}
                {positionedByDay[index]?.map(({ item, top, height, column }) => (
                  <CalendarEventChip
                    key={item.id}
                    item={item}
                    onSelect={onSelect}
                    variant="timed"
                    className="absolute"
                    style={{ top: top - offset + 1, height: height - 2, ...overlapStyle(column) }}
                  />
                ))}
                {day === today && nowTop >= 0 && (
                  <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: nowTop }}>
                    <div className="absolute -top-[3px] -left-[3px] size-1.5 rounded-full bg-primary" />
                    <div className="h-0.5 bg-primary" />
                  </div>
                )}
              </div>
            ))}
          </CalendarTimeGridColumns>
        </div>
      </ScrollArea>
    </CalendarTimeGrid>
  );
}
