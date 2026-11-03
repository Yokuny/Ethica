import type { CalendarEntrySource, CalendarEntryStatus, CalendarEntryType } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Mirrors CalendarEntryRecord of apps/api/src/modules/agenda/calendar-entry.schema.ts (AD-169): all-day
// entries sent by the deadlines and by finance. Date `YYYY-MM-DD`.
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
  caseNumber?: string;
};

export type CalendarEntriesQueryParams = { from: string; to: string; type?: CalendarEntryType };

// The finance types come only for whoever sees finance (the server filters).
export const calendarEntriesQuery = (params: CalendarEntriesQueryParams) =>
  queryOptions({
    queryKey: ['calendar-entry', params] as const,
    queryFn: async (): Promise<CalendarEntryRecord[]> => {
      const search = new URLSearchParams({ from: params.from, to: params.to });
      if (params.type) search.set('type', params.type);
      const res = await get<CalendarEntryRecord[]>(`/agenda/entries?${search.toString()}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });
