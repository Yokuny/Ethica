import { formatDisplayDate, formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';

export const HOUR_HEIGHT_PX = 48;
export const HOURS_IN_DAY = 24;
const MINUTES_IN_DAY = HOURS_IN_DAY * 60;
const COLUMN_HEIGHT_PX = HOURS_IN_DAY * HOUR_HEIGHT_PX;
const MIN_ITEM_HEIGHT_PX = 20;

export type PositionedItem = {
  item: AppointmentRecord;
  // px from the top of the day column (00:00) and height in px — always
  // derived from formatDisplayTime/formatDisplayDate (display time zone),
  // never from date-fns/browser time zone (AD-036).
  top: number;
  height: number;
  // Position of the item inside the cluster of overlapping items it belongs to
  // (0 = overlaps nothing before it). The view uses it to "stack in a
  // cascade" whoever overlaps, never to split the column width into N —
  // see the computePositionedItems comment.
  column: number;
};

const displayMinutesOfDay = (instant: string): number => {
  const [hours, minutes] = formatDisplayTime(instant).split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
};

// Part of the item that falls inside `day` (YYYY-MM-DD, display time zone), in
// minutes since 00:00. A block can span several days (e.g. 18/09
// 00:00 -> 19/09 23:59): on the middle days the part is the whole day, and it never
// goes past 24h — otherwise the item leaks out of the column. `null` when the item does not touch
// the day (including when it ends exactly at its 00:00).
const daySegment = (item: AppointmentRecord, day: string): { startMinutes: number; endMinutes: number } | null => {
  const startDay = formatDisplayDate(item.start);
  const endDay = formatDisplayDate(item.end);
  if (startDay > day || endDay < day) return null;

  const startMinutes = startDay === day ? displayMinutesOfDay(item.start) : 0;
  const endMinutes = endDay === day ? displayMinutesOfDay(item.end) : MINUTES_IN_DAY;
  if (startDay !== day && endMinutes === 0) return null;

  return { startMinutes, endMinutes: Math.max(endMinutes, startMinutes) };
};

export const itemOverlapsDay = (item: AppointmentRecord, day: string): boolean => daySegment(item, day) !== null;

// Overlapping item layout for a single-day grid: groups the
// parts into clusters of crossing times and gives each one a column
// index (greedy interval coloring algorithm). The view uses that
// index to stack in a CASCADE (each overlapping item shifts a bit to the
// right and gets a bit narrower, always staying readable) — never
// to split the width into 1/N, which turns the cards into 1-character
// slivers when there are 3+ overlapping times on the same day.
export function computePositionedItems(items: AppointmentRecord[], day: string): PositionedItem[] {
  const entries = items
    .flatMap((item) => {
      const segment = daySegment(item, day);
      return segment ? [{ item, ...segment }] : [];
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const positioned: PositionedItem[] = [];
  let cluster: typeof entries = [];
  let clusterEndMinutes = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnEndMinutes: number[] = [];
    const columnByEntry = cluster.map((entry) => {
      let column = columnEndMinutes.findIndex((end) => end <= entry.startMinutes);
      if (column === -1) column = columnEndMinutes.length;
      columnEndMinutes[column] = entry.endMinutes;
      return column;
    });

    cluster.forEach((entry, index) => {
      const height = Math.max(((entry.endMinutes - entry.startMinutes) / 60) * HOUR_HEIGHT_PX, MIN_ITEM_HEIGHT_PX);
      // A very short item at the end of the day (e.g. 23:50) gets the minimum height and
      // would go past the last line — it moves up enough to fit in the column.
      const top = Math.min((entry.startMinutes / 60) * HOUR_HEIGHT_PX, COLUMN_HEIGHT_PX - height);
      positioned.push({ item: entry.item, top, height, column: columnByEntry[index] as number });
    });
    cluster = [];
  };

  for (const entry of entries) {
    if (cluster.length > 0 && entry.startMinutes >= clusterEndMinutes) {
      flushCluster();
      clusterEndMinutes = -Infinity;
    }
    cluster.push(entry);
    clusterEndMinutes = Math.max(clusterEndMinutes, entry.endMinutes);
  }
  flushCluster();

  return positioned;
}
