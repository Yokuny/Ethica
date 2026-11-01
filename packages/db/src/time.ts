import { DISPLAY_TIMEZONE } from '@ethica/contracts';

// Conversion between instant (UTC, as it is stored) and wall-clock time in the display
// time zone (AD-036, AD-103). Pure module, no Mongoose: used by the services when
// converting the input `date`+`time` and by the daily indicator series.

// Resolves the offset (in minutes, positive east of UTC) in force at an
// instant, for a named time zone — never a fixed string like '-03:00', which
// breaks if Brazilian daylight saving time comes back (AD-036).
const getOffsetMinutes = (instant: Date, timeZone: string): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const label = formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
};

// Wall-clock time -> UTC instant, without a hard-coded offset: two passes of
// Intl.DateTimeFormat (verified by running it in Design — see
// Research Provenance in design.md). The first pass estimates the offset from
// a naive read (the wall-clock time read as if it already
// were UTC); the second re-resolves the offset at the candidate instant, which is
// what actually applies to the target date.
export const wallClockToUtc = (date: string, time: string, timeZone: string = DISPLAY_TIMEZONE): Date => {
  const naiveUtcMs = Date.parse(`${date}T${time}:00.000Z`);
  const firstPassOffset = getOffsetMinutes(new Date(naiveUtcMs), timeZone);
  const candidateMs = naiveUtcMs - firstPassOffset * 60_000;
  const secondPassOffset = getOffsetMinutes(new Date(candidateMs), timeZone);
  return new Date(naiveUtcMs - secondPassOffset * 60_000);
};

export const dateInDisplayTz = (instant: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);

export const timeInDisplayTz = (instant: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
