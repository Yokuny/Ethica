import { addDaysToDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';

// The API accepts up to 366 days (AD-208): the range is kept within it.
const RANGE_MAX_DAYS = 366;

// Days of the range, both ends included.
const rangeDays = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1;

// The range between two clicked days, in any order, cut at 366 days from the first.
export const rangeOf = (one: string, other: string): { from: string; to: string } => {
  const [from, to] = [one, other].sort() as [string, string];
  return { from, to: rangeDays(from, to) > RANGE_MAX_DAYS ? addDaysToDisplayDate(from, RANGE_MAX_DAYS - 1) : to };
};

// "20 nov 2026" or "20 nov 2026 – 26 nov 2026".
export const rangeLabel = (from: string, to: string): string =>
  from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
