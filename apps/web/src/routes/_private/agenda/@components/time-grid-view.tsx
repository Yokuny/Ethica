import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ScrollArea } from '@ethica/ui/components/scroll-area';
import { weekdayIndexOfDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t, WEEKDAY_KEYS } from '@/lib/helpers/translate.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { DeadlineRecord } from '@/query/deadline.js';
import { computePositionedItems, HOUR_HEIGHT_PX, HOURS_IN_DAY } from '../@utils/calendar-grid.utils.js';
import { CalendarDeadlineChip, CalendarEventChip } from './calendar-event.js';
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
  // Pending deadlines: "all day" strip under the header (a deadline is a day, not a time).
  deadlines?: DeadlineRecord[];
  onSelectDeadline?: (deadline: DeadlineRecord) => void;
  today?: string;
};

const HOURS = Array.from({ length: HOURS_IN_DAY }, (_, hour) => hour);

// Visible height of the grid body (hours ruler + day columns): the
// 24h (COLUMN_HEIGHT_PX = 24*48) rarely fit whole on screen, so the
// body scrolls vertically IN HERE (the day header stays fixed on top)
// instead of stretching the whole page.
const GRID_BODY_HEIGHT_PX = 640;

// Time overlap stacks in a cascade (see computePositionedItems):
// the first item of a cluster is 100% wide, each one after it shifts
// a bit to the right and loses only a bit of width — it never splits the column
// into 1/N (which turned into 1-character slivers with 3+ times in the same slot).
const overlapStyle = (column: number): { left: string; width: string; zIndex: number } => ({
  left: column === 0 ? '0%' : `${column * 10}%`,
  width: column === 0 ? '100%' : '90%',
  zIndex: 10 + column,
});

// Hour grid with events positioned by time/duration
// (calendar-grid.utils.ts). Frame and dashed lines come from the primitive
// (components/ui/calendar-grid.tsx) — here only composition and position.
export function TimeGridView({
  days,
  items,
  onSelect,
  deadlines = [],
  onSelectDeadline = () => {},
  today = '',
}: TimeGridViewProps) {
  const hasDeadlines = deadlines.some((deadline) => days.includes(deadline.dueDate));
  return (
    <CalendarTimeGrid className="min-w-160 flex-col" data-testid="time-grid-view">
      {/* Fixed header (outside the ScrollArea): empty hours ruler + date of
          each day, always visible while the body scrolls under it. */}
      <div className="flex">
        <div className="w-10 shrink-0">
          <CalendarTimeGridHeader />
        </div>
        <CalendarTimeGridColumns style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day) => (
            <CalendarTimeGridHeader key={day}>
              <ItemTitle>{t(WEEKDAY_KEYS[weekdayIndexOfDisplayDate(day)])}</ItemTitle>
              <ItemDescription className="line-clamp-none text-[10px]">{formatDate(day)}</ItemDescription>
            </CalendarTimeGridHeader>
          ))}
        </CalendarTimeGridColumns>
      </div>
      {hasDeadlines && (
        <div className="flex" data-testid="time-grid-all-day">
          <ItemDescription className="line-clamp-none w-10 shrink-0 pr-1 text-right text-[10px]">
            {t('all_day')}
          </ItemDescription>
          <CalendarTimeGridColumns style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((day) => (
              <div key={day} className="grid content-start gap-1 p-1">
                {deadlines
                  .filter((deadline) => deadline.dueDate === day)
                  .map((deadline) => (
                    <CalendarDeadlineChip
                      key={deadline.id}
                      deadline={deadline}
                      today={today}
                      onSelect={onSelectDeadline}
                    />
                  ))}
              </div>
            ))}
          </CalendarTimeGridColumns>
        </div>
      )}
      <ScrollArea style={{ height: GRID_BODY_HEIGHT_PX }}>
        <div className="flex">
          <div className="w-10 shrink-0">
            {HOURS.map((hour) => (
              <ItemDescription
                key={hour}
                style={{ height: HOUR_HEIGHT_PX }}
                className="line-clamp-none pr-1 text-right text-[10px]"
              >
                {String(hour).padStart(2, '0')}h
              </ItemDescription>
            ))}
          </div>
          <CalendarTimeGridColumns style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((day) => {
              const positioned = computePositionedItems(items, day);

              return (
                <div
                  key={day}
                  data-testid={`time-grid-day-${day}`}
                  className="relative"
                  style={{ height: HOURS_IN_DAY * HOUR_HEIGHT_PX }}
                >
                  {HOURS.slice(1).map((hour) => (
                    <CalendarTimeGridHourLine key={hour} style={{ top: hour * HOUR_HEIGHT_PX }} />
                  ))}
                  {positioned.map(({ item, top, height, column }) => (
                    <CalendarEventChip
                      key={item.id}
                      item={item}
                      onSelect={onSelect}
                      variant="timed"
                      className="absolute"
                      style={{ top, height, ...overlapStyle(column) }}
                    />
                  ))}
                </div>
              );
            })}
          </CalendarTimeGridColumns>
        </div>
      </ScrollArea>
    </CalendarTimeGrid>
  );
}
