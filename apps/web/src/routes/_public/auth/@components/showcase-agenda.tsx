import { ItemDescription } from '@ethica/ui/components/item';
import { CalendarEntryChip, CalendarEventChip } from '@/components/calendar-event.js';
import { CalendarMonthCell, CalendarMonthGrid } from '@/components/calendar-grid.js';
import {
  addDaysToDisplayDate,
  currentDisplayWeekStart,
  displayWallClockToUtcIso,
  formatDisplayDate,
  weekdayIndexOfDisplayDate,
} from '@/lib/helpers/displayTime.helper.js';
import { t, WEEKDAY_KEYS } from '@/lib/helpers/translate.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { CalendarEntryRecord } from '@/query/calendar-entry.js';

// APA-10: two weeks of the agenda month view, with the same grid and chips of the real calendar.

const WEEK_START = currentDisplayWeekStart();
const DAYS = Array.from({ length: 14 }, (_, index) => addDaysToDisplayDate(WEEK_START, index));
const TODAY = formatDisplayDate(new Date());
const noop = () => {};

const appointment = (
  id: string,
  dayOffset: number,
  from: string,
  to: string,
  type: AppointmentRecord['type'],
  title: string,
): AppointmentRecord => {
  const day = addDaysToDisplayDate(WEEK_START, dayOffset);
  return {
    id,
    type,
    title,
    start: displayWallClockToUtcIso(day, from),
    end: displayWallClockToUtcIso(day, to),
    status: 'scheduled',
    origin: 'manual',
  };
};

const APPOINTMENTS = [
  appointment('a1', 0, '09:00', '11:00', 'inspection', t('sample_inspection_title')),
  appointment('a2', 1, '14:00', '15:00', 'hearing', t('sample_hearing_title')),
  appointment('a3', 3, '08:30', '10:00', 'inspection', t('sample_stop_factory')),
  appointment('a4', 3, '16:30', '17:30', 'meeting', t('sample_meeting_title')),
  appointment('a5', 7, '10:00', '12:00', 'inspection', t('sample_stop_building')),
  appointment('a6', 9, '13:30', '14:30', 'hearing', t('sample_hearing_title')),
  appointment('a7', 11, '09:00', '10:30', 'inspection', t('sample_stop_warehouse')),
];

// All-day entries from today on, so none shows as overdue (red).
const entry = (
  id: string,
  daysFromToday: number,
  type: CalendarEntryRecord['type'],
  title: string,
  extra: Pick<CalendarEntryRecord, 'amountCents' | 'caseNumber'>,
): CalendarEntryRecord => ({
  id,
  source: type === 'deadline' ? 'deadline' : 'transaction',
  originId: id,
  type,
  title,
  date: addDaysToDisplayDate(TODAY, daysFromToday),
  status: 'open',
  ...extra,
});

const ENTRIES = [
  entry('e1', 1, 'deadline', t('report_deadline'), {}),
  entry('e2', 2, 'income', t('fees'), { amountCents: 480_000 }),
  entry('e3', 5, 'deadline', t('report_deadline'), {}),
  entry('e4', 7, 'expense', t('fuel'), { amountCents: 8_290 }),
];

export function ShowcaseAgenda() {
  return (
    <CalendarMonthGrid>
      {DAYS.slice(0, 7).map((day) => (
        <ItemDescription key={day} className="line-clamp-none p-1 text-center text-[10px]">
          {t(WEEKDAY_KEYS[weekdayIndexOfDisplayDate(day)])}
        </ItemDescription>
      ))}
      {DAYS.map((day) => (
        <CalendarMonthCell key={day} className="min-h-28">
          <ItemDescription className="line-clamp-none text-right text-[10px]">{day.slice(-2)}</ItemDescription>
          {ENTRIES.filter((item) => item.date === day).map((item) => (
            <CalendarEntryChip key={item.id} entry={item} today={TODAY} onSelect={noop} />
          ))}
          {APPOINTMENTS.filter((item) => formatDisplayDate(item.start) === day).map((item) => (
            <CalendarEventChip key={item.id} item={item} onSelect={noop} variant="compact" />
          ))}
        </CalendarMonthCell>
      ))}
    </CalendarMonthGrid>
  );
}
