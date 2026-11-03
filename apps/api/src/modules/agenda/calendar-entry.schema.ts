import {
  CALENDAR_ENTRY_TYPES,
  type CalendarEntryInput,
  type CalendarEntrySource,
  type CalendarEntryStatus,
  type CalendarEntryType,
  calendarDateSchema,
} from '@ethica/contracts';
import { z } from 'zod';

export type { CalendarEntryInput, CalendarEntrySource };

// Agenda range of the all-day entries (AEV-03), the same window rule as the appointments.
export const listCalendarEntriesQuerySchema = z
  .object({
    from: calendarDateSchema,
    to: calendarDateSchema,
    type: z.enum(CALENDAR_ENTRY_TYPES).optional(),
  })
  .strict()
  .refine((query) => query.from < query.to, { message: 'from precisa ser antes de to', path: ['to'] });
export type ListCalendarEntriesQuery = z.infer<typeof listCalendarEntriesQuerySchema>;

export type CalendarEntryRecord = {
  id: string;
  source: CalendarEntrySource;
  originId: string;
  type: CalendarEntryType;
  title: string;
  date: string;
  status: CalendarEntryStatus;
  amountCents?: number;
  caseId?: string;
  // Enriched by the service; missing if the case no longer exists.
  caseNumber?: string;
};

// What an origin sends to the agenda (AD-169): all its entries, replacing the previous ones.
export type CalendarEntriesSync = {
  tenantId: string;
  source: CalendarEntrySource;
  originId: string;
  caseId?: string;
  entries: CalendarEntryInput[];
};
