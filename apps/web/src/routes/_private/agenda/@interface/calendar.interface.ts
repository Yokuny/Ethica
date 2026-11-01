import { APPOINTMENT_TYPES } from '@ethica/contracts';
import { z } from 'zod';
import type { AppointmentRecord } from '@/query/appointment.js';
import type { DeadlineRecord } from '@/query/deadline.js';
import { CALENDAR_VIEWS } from '../@consts/calendar.js';

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

// Which dialog is open — never more than one at a time.
export type PanelState =
  | { kind: 'create'; date?: string }
  | { kind: 'detail'; appointment: AppointmentRecord }
  | { kind: 'edit'; appointment: AppointmentRecord }
  | { kind: 'deadline'; deadline: DeadlineRecord }
  | null;

// `view`/`date`/`type` are the only source of truth for what is rendered:
// every change goes through navigate() and redoes the server query.
export const calendarSearchSchema = z.object({
  view: z.enum(CALENDAR_VIEWS).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date inválida (YYYY-MM-DD)')
    .optional(),
  type: z.enum(APPOINTMENT_TYPES).optional(),
  // Shortcut from the case detail: opens the "new appointment" already linked.
  caseId: z.string().optional(),
});
export type CalendarSearch = z.infer<typeof calendarSearchSchema>;
