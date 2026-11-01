import { formatDistanceToNow as dateFnsFormatDistanceToNow, format, type Locale } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDisplayDate, formatDisplayTime } from './displayTime.helper.js';
import { DEFAULT_LANGUAGE, type Language } from './translate.helper.js';

// The only place in the app that imports date-fns: every date/time DISPLAYED on screen
// goes through here, in the user's language format. The "data" formats
// (`YYYY-MM-DD`/`HH:mm` of search param, <input> value, grid key)
// stay in displayTime.helper.ts and never go straight to the screen.

type DateFormats = { locale: Locale; date: string; time: string; dateTime: string };

// Patterns per language, in LOCALIZED date-fns tokens (`PP`/`p`): the order
// and punctuation come from the locale itself. pt-BR: "1 jun 2026", "14:05".
const DATE_FORMATS: Record<Language, DateFormats> = {
  'pt-BR': { locale: ptBR, date: 'PP', time: 'p', dateTime: "PP '·' p" },
};

export type DateInput = Date | string | number;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^([01]\d|2[0-3]):([0-5]\d)$/;

// 12h with AM/PM glued to the number (no space: "9AM", "6:40PM"), without the
// minutes when they are :00 — only used where that specific format is asked
// for (Professional weekly agenda, Appointment chips/detail
// in the calendar); the rest of the app stays on formatTime (24h). AM/PM always comes out
// as the last 2 letters of the `a` token (uppercase, no alternative
// locale today) — that is what PERIOD_SUFFIX uses to split both when
// rendering the period in a smaller font (Time12h, components/).
const HOUR_12_FORMATS: Record<Language, { locale: Locale; hourOnly: string; hourMinute: string }> = {
  'pt-BR': { locale: ptBR, hourOnly: 'ha', hourMinute: 'h:mma' },
};
const PERIOD_SUFFIX = /(AM|PM)$/;

const toInstant = (value: DateInput): Date | null => {
  const instant = value instanceof Date ? value : new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
};

// date-fns `format` always reads the LOCAL components of the Date — so the
// input becomes a "wall-clock" Date (local components = what should show
// on screen), regardless of the browser time zone:
// - `YYYY-MM-DD` is a wall-clock date, without a time zone: built directly, never via
//   `new Date('2026-06-01')` (UTC midnight = 31/05 in a negative time zone).
// - any other input (Date, timestamp, ISO with time) is an instant:
//   it goes to the display time zone (DISPLAY_TIMEZONE, AD-036), never the browser's.
const toWallClock = (value: DateInput): Date | null => {
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    return new Date(year, month - 1, day);
  }
  const instant = toInstant(value);
  if (!instant) return null;
  const [year, month, day] = formatDisplayDate(instant).split('-').map(Number) as [number, number, number];
  const [hours, minutes] = formatDisplayTime(instant).split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hours, minutes);
};

const formatAs = (value: DateInput, pattern: 'date' | 'time' | 'dateTime', language: Language): string => {
  const wallClock = toWallClock(value);
  if (!wallClock) return '';
  const formats = DATE_FORMATS[language];
  return format(wallClock, formats[pattern], { locale: formats.locale });
};

/**
 * Date in the language pattern. Invalid input becomes `''`.
 *
 * @example
 * formatDate('2026-06-01') // "1 jun 2026"
 * formatDate('2026-06-01T15:00:00.000Z') // "1 jun 2026" (display time zone)
 */
export const formatDate = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string =>
  formatAs(value, 'date', language);

/**
 * Time in the language pattern, in the display time zone.
 *
 * @example
 * formatTime('2026-06-01T15:00:00.000Z') // "12:00"
 */
export const formatTime = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string =>
  formatAs(value, 'time', language);

export type Time12hParts = { value: string; period: string };

/**
 * 12h time with AM/PM, without the minutes when they are :00, split into
 * {value, period} for whoever needs to render the period (AM/PM) in a smaller
 * font than the number (`Time12h`, `components/time12h.tsx`) — `formatTime12h`
 * below is just the concatenation of both parts, for whoever only needs the plain
 * text (aria-label, title, test). Accepts both an instant/Date (same
 * conversion to the display time zone as formatTime) and a loose wall-clock time
 * in the `HH:mm` format, without a date (e.g. Professional weeklySchedule) —
 * in that case the minutes are already literal, without a time zone.
 *
 * @example
 * formatTime12hParts('09:00') // { value: '9', period: 'AM' }
 * formatTime12hParts('2026-06-01T21:40:00.000Z') // { value: '6:40', period: 'PM' } (display time zone)
 */
export const formatTime12hParts = (value: DateInput, language: Language = DEFAULT_LANGUAGE): Time12hParts | null => {
  const wallClock =
    typeof value === 'string' && TIME_ONLY.test(value)
      ? new Date(1970, 0, 1, ...(value.split(':').map(Number) as [number, number]))
      : toWallClock(value);
  if (!wallClock) return null;
  const formats = HOUR_12_FORMATS[language];
  const pattern = wallClock.getMinutes() === 0 ? formats.hourOnly : formats.hourMinute;
  const formatted = format(wallClock, pattern, { locale: formats.locale });
  const period = formatted.match(PERIOD_SUFFIX)?.[0] ?? '';
  return { value: formatted.slice(0, formatted.length - period.length), period };
};

/**
 * `formatTime12hParts` as plain text, without splitting the period — for
 * aria-label/title/test, where there is no way (or no point) to style
 * AM/PM in a smaller font.
 *
 * @example
 * formatTime12h('09:00') // "9AM"
 * formatTime12h('2026-06-01T21:40:00.000Z') // "6:40PM" (display time zone)
 */
export const formatTime12h = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string => {
  const parts = formatTime12hParts(value, language);
  return parts ? `${parts.value}${parts.period}` : '';
};

/**
 * Date + time in the language pattern, in the display time zone.
 *
 * @example
 * formatDateTime('2026-06-01T15:00:00.000Z') // "1 jun 2026 · 12:00"
 */
export const formatDateTime = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string =>
  formatAs(value, 'dateTime', language);

/**
 * Relative distance to now, with a suffix. Instant comparison —
 * independent of time zone.
 *
 * @example
 * formatDistanceToNow(threeDaysAgo) // "há 3 dias"
 */
export const formatDistanceToNow = (value: DateInput, language: Language = DEFAULT_LANGUAGE): string => {
  const instant = toInstant(value);
  return instant ? dateFnsFormatDistanceToNow(instant, { locale: DATE_FORMATS[language].locale, addSuffix: true }) : '';
};

// date-fns locale of the language, for components that format dates on their
// own (the react-day-picker <Calendar>: month, weekdays) — so
// nenhum outro arquivo importa `date-fns/locale`.
export const getDateLocale = (language: Language = DEFAULT_LANGUAGE): Locale => DATE_FORMATS[language].locale;
