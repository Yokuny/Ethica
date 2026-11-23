import { z } from 'zod';

// Time convention (AD-036, AD-103): a calendar date (deadline, due date) travels and
// is stored as `YYYY-MM-DD` in the display time zone; wall-clock time as `HH:mm`.
// An instant (start of an appointment) only exists on the server, in UTC.
// A day that exists on the calendar: `2026-02-30` and `2026-13-45` stop at the edge (400), never reach the database.
const isRealDay = (value: string): boolean => new Date(`${value}T12:00:00Z`).toISOString().startsWith(value);
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'informe a data')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && isRealDay(value), 'data inválida');
export const wallTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'horário inválido (HH:mm)');
