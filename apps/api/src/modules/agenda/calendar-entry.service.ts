import { CALENDAR_ENTRY_TYPES, type CalendarEntryType, caseLabel, FINANCE_ENTRY_TYPES } from '@ethica/contracts';
import * as caseService from '../case/case.service.js';
import * as calendarEntryRepository from './calendar-entry.repository.js';
import type { CalendarEntriesSync, CalendarEntryRecord, ListCalendarEntriesQuery } from './calendar-entry.schema.js';

const withCaseNumber = async (tenantId: string, items: CalendarEntryRecord[]): Promise<CalendarEntryRecord[]> => {
  const ids = [...new Set(items.flatMap((item) => (item.caseId ? [item.caseId] : [])))];
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return items.map((item) => {
    const summary = item.caseId ? summaries.get(item.caseId) : undefined;
    return summary ? { ...item, caseNumber: caseLabel(summary) } : item;
  });
};

// Subscriber of `agenda:entries_synced` (AD-169).
export const syncOrigin = (sync: CalendarEntriesSync) => calendarEntryRepository.replaceOrigin(sync);

export const deleteDeadlinesOfCase = (tenantId: string, caseId: string) =>
  calendarEntryRepository.deleteDeadlinesOfCase(tenantId, caseId);

// The finance entries only for whoever sees finance (AD-137).
export const listEntries = async (
  tenantId: string,
  { from, to, type }: ListCalendarEntriesQuery,
  canSeeFinance: boolean,
): Promise<CalendarEntryRecord[]> => {
  const allowed = CALENDAR_ENTRY_TYPES.filter((item) => canSeeFinance || !FINANCE_ENTRY_TYPES.includes(item));
  const types: CalendarEntryType[] = type ? allowed.filter((item) => item === type) : allowed;
  return withCaseNumber(tenantId, await calendarEntryRepository.listInRange(tenantId, { from, to }, types));
};
