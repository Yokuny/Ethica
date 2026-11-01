import { DISPLAY_TIMEZONE } from '@ethica/contracts';

// AD-036/design.md Risk: "an operator with the browser in another time zone would see
// times different from those the AI sends, and CI runs in UTC" — this file
// only exists to not repeat that bug: every instant (Date/ISO in UTC) is
// converted into the fixed DISPLAY time zone (`DISPLAY_TIMEZONE`,
// packages/contracts), the same time zone the back-end uses to generate
// `dateInDisplayTz`/`timeInDisplayTz` (packages/db) — never `date-fns`, never
// the runtime's default `Intl` time zone. The `YYYY-MM-DD`/`HH:mm` here are
// DATA format (search param, <input> value, grid key), never
// screen text: what is displayed goes through `formatDate.helper.ts` (sibling),
// which uses these same conversions and applies the user's language pattern.
const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

// `en-CA` formats `{year, month, day}` as `YYYY-MM-DD` natively — without
// it the string would have to be rebuilt from `formatToParts`.
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: DISPLAY_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Formats a UTC instant (Date or ISO string) as `YYYY-MM-DD` in the display time zone (`DISPLAY_TIMEZONE`). */
export const formatDisplayDate = (value: Date | string): string => dateFormatter.format(toDate(value));

/** Formats a UTC instant (Date or ISO string) as `HH:mm` in the display time zone (`DISPLAY_TIMEZONE`). */
export const formatDisplayTime = (value: Date | string): string => timeFormatter.format(toDate(value));

// Pure CALENDAR arithmetic over a wall-clock date (`YYYY-MM-DD`) —
// never over an instant: adds/subtracts days on the Y/M/D components through a
// Date.UTC used only as a calculator (it does not represent any real instant),
// the same reasoning as the back-end `wallClockToUtc`/`dateInDisplayTz`
// (packages/db), keeping the time zone conversion isolated in the formatters above.
export const addDaysToDisplayDate = (date: string, days: number): string => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

// Day of the week (0=Sunday..6=Saturday, same range as `weeklySchedule`/
// `t(WEEKDAY_KEYS[N])`) of a wall-clock date — pure calendar calculation
// (the weekday of a date does not depend on any time zone).
export const weekdayIndexOfDisplayDate = (date: string): number => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

// Monday (this project's convention for the start of the week, SCH-29) of the
// week containing any wall-clock date — same pure calendar
// arithmetic as addDaysToDisplayDate, generalized to any `date`
// (not only "today"), used by the calendar day/week/month views.
export const displayWeekStartOf = (date: string): string => {
  const offsetFromMonday = (weekdayIndexOfDisplayDate(date) + 6) % 7; // domingo(0)->6 ... segunda(1)->0
  return addDaysToDisplayDate(date, -offsetFromMonday);
};

// Monday of the current week, calculated from "today" IN THE DISPLAY
// TIME ZONE — never in the browser/CI time zone.
export const currentDisplayWeekStart = (now: Date = new Date()): string => displayWeekStartOf(formatDisplayDate(now));

// Day 1 of the month containing a wall-clock date — pure calendar arithmetic
// (same reasoning as addDaysToDisplayDate).
export const startOfDisplayMonth = (date: string): string => {
  const [year, month] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
};

// How many days the month containing `date` has (day 0 of the next month = last
// day of the current month, standard Date.UTC trick) — used to build the
// month view grid.
export const daysInDisplayMonth = (date: string): number => {
  const [year, month] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

// Adds/subtracts months to a wall-clock date, keeping the day when possible
// and clamping to the last day of the target month when it does not
// exist (e.g. 31/01 + 1 month -> 28/02, never 03/03 through a
// Date.UTC overflow) — same semantics as date-fns addMonths, implemented without the
// dependency (this file never uses date-fns, see the header).
export const addMonthsToDisplayDate = (date: string, months: number): string => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const targetIndex = month - 1 + months;
  const daysInTargetMonth = new Date(Date.UTC(year, targetIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetIndex, Math.min(day, daysInTargetMonth))).toISOString().slice(0, 10);
};

// SCH-35: "the time passed without any mark" — an INSTANT comparison
// (timestamp), not a time zone one: independent of `DISPLAY_TIMEZONE` by construction,
// but it lives here because every consumer (week-grid.tsx) already formats the same
// instant with the functions above.
export const isPastInstant = (value: Date | string, now: Date = new Date()): boolean =>
  toDate(value).getTime() < now.getTime();

// Offset (in minutes, positive east of UTC) of DISPLAY_TIMEZONE at an instant.
// `longOffset` gives "GMT-03:00" (or just "GMT" in UTC); never a hard-coded offset.
const displayOffsetMinutes = (instant: Date): number => {
  const label =
    new Intl.DateTimeFormat('en-US', { timeZone: DISPLAY_TIMEZONE, timeZoneName: 'longOffset' })
      .formatToParts(instant)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
};

/**
 * Wall-clock time (`YYYY-MM-DD` + `HH:mm`, as the user types in the <input>) in the
 * display time zone -> UTC instant in ISO 8601. Same two-pass calculation
 * as `wallClockToUtc` (packages/db), which the front does not import: the saved instant
 * is what the server sees, whatever the browser time zone (AD-036).
 *
 * @example
 * displayWallClockToUtcIso('2026-10-10', '23:59') // "2026-10-11T02:59:00.000Z"
 */
export const displayWallClockToUtcIso = (date: string, time: string): string => {
  const naive = Date.parse(`${date}T${time}:00.000Z`);
  const candidate = naive - displayOffsetMinutes(new Date(naive)) * 60_000;
  return new Date(naive - displayOffsetMinutes(new Date(candidate)) * 60_000).toISOString();
};
