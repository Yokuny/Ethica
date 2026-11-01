import { z } from 'zod';

// Time convention (AD-036, AD-103): a calendar date (deadline, due date) travels and
// is stored as `YYYY-MM-DD` in the display time zone; wall-clock time as `HH:mm`.
// An instant (start of an appointment) only exists on the server, in UTC.
export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data inválida (YYYY-MM-DD)');
export const wallTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'horário inválido (HH:mm)');
