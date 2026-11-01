import {
  addDaysToDisplayDate,
  addMonthsToDisplayDate,
  displayWeekStartOf,
  startOfDisplayMonth,
} from '@/lib/helpers/displayTime.helper.js';
import type { CalendarView } from '../@interface/calendar.interface.js';

// Calculates the [from,to) range sent to appointmentsQuery from the active
// view — every view stays below the API 62-day limit
// (MAX_RANGE_DAYS in apps/api/src/modules/agenda/appointment.schema.ts).
export const rangeForView = (view: CalendarView, date: string): { from: string; to: string } => {
  if (view === 'day') return { from: date, to: addDaysToDisplayDate(date, 1) };
  // Month: the whole grid (6 weeks from the Monday of the 1st week), so
  // the previous/next month days that complete the grid also show items.
  if (view === 'month') {
    const from = displayWeekStartOf(startOfDisplayMonth(date));
    return { from, to: addDaysToDisplayDate(from, 42) };
  }
  const from = displayWeekStartOf(date);
  return { from, to: addDaysToDisplayDate(from, 7) };
};

// The previous/next navigation step depends on the active view: 1 day, 7 days
// or 1 month (with end-of-month clamp, addMonthsToDisplayDate).
export const shiftDate = (view: CalendarView, date: string, direction: 1 | -1): string => {
  if (view === 'day') return addDaysToDisplayDate(date, direction);
  if (view === 'month') return addMonthsToDisplayDate(date, direction);
  return addDaysToDisplayDate(date, direction * 7);
};
