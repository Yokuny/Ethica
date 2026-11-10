import {
  addDaysToDisplayDate,
  addMonthsToDisplayDate,
  daysInDisplayMonth,
  displayWeekStartOf,
  startOfDisplayMonth,
} from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import type { FieldPeriod } from '../@interface/field.interface.js';

// Field period (CPE-01): the day, the week (Monday to Sunday), the month or the year of `date`, both ends included.
export const periodRange = (period: FieldPeriod, date: string): { from: string; to: string } => {
  if (period === 'day') return { from: date, to: date };
  if (period === 'week') {
    const from = displayWeekStartOf(date);
    return { from, to: addDaysToDisplayDate(from, 6) };
  }
  if (period === 'month') {
    const from = startOfDisplayMonth(date);
    return { from, to: addDaysToDisplayDate(from, daysInDisplayMonth(date) - 1) };
  }
  return { from: `${date.slice(0, 4)}-01-01`, to: `${date.slice(0, 4)}-12-31` };
};

// The same period before (-1) or after (1).
export const shiftPeriod = (period: FieldPeriod, date: string, direction: -1 | 1): string =>
  period === 'day'
    ? addDaysToDisplayDate(date, direction)
    : period === 'week'
      ? addDaysToDisplayDate(date, 7 * direction)
      : addMonthsToDisplayDate(date, period === 'month' ? direction : 12 * direction);

const shortDay = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const utc = (date: string) => new Date(`${date}T12:00:00Z`);

// "12/11/2026", "10/11 – 16/11/2026", "novembro de 2026", "2026".
export const periodLabel = (period: FieldPeriod, date: string): string => {
  const { from, to } = periodRange(period, date);
  if (period === 'day') return formatDate(new Date(`${date}T12:00:00`));
  if (period === 'week') return `${shortDay.format(utc(from))} – ${formatDate(new Date(`${to}T12:00:00`))}`;
  if (period === 'month') return monthYear.format(utc(from));
  return from.slice(0, 4);
};
