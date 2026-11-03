import type { CalendarEntryType } from '@ethica/contracts';
import { CalendarEntry, type CalendarEntryDocument, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CalendarEntriesSync, CalendarEntryRecord } from './calendar-entry.schema.js';

const toRecord = (doc: CalendarEntryDocument): CalendarEntryRecord => ({
  id: doc._id.toString(),
  source: doc.source,
  originId: doc.originId,
  type: doc.type,
  title: doc.title,
  date: doc.date,
  status: doc.status,
  amountCents: doc.amountCents,
  caseId: doc.Case?.toString(),
});

// The origin's entries are replaced as a whole: an empty list removes them (deleted origin).
export const replaceOrigin = async ({ tenantId, source, originId, caseId, entries }: CalendarEntriesSync) =>
  withDbTiming('calendarEntry.replaceOrigin', async () => {
    await CalendarEntry.deleteMany(tenantScoped({ Tenant: tenantId, source, originId }));
    if (entries.length) {
      await CalendarEntry.insertMany(
        entries.map((entry) => ({ ...entry, Tenant: tenantId, source, originId, ...(caseId ? { Case: caseId } : {}) })),
      );
    }
  });

// Entries in [from, to) of the allowed types, by day.
export const listInRange = async (
  tenantId: string,
  range: { from: string; to: string },
  types: readonly CalendarEntryType[],
): Promise<CalendarEntryRecord[]> =>
  withDbTiming('calendarEntry.listInRange', async () => {
    const docs = await CalendarEntry.find(
      tenantScoped({ Tenant: tenantId, date: { $gte: range.from, $lt: range.to }, type: { $in: types } }),
    )
      .sort({ date: 1, title: 1 })
      .lean();
    return docs.map(toRecord);
  });

// The deadlines of a deleted case go with it (the case module deletes them without one event each).
export const deleteDeadlinesOfCase = (tenantId: string, caseId: string) =>
  withDbTiming('calendarEntry.deleteDeadlinesOfCase', () =>
    CalendarEntry.deleteMany(tenantScoped({ Tenant: tenantId, Case: caseId, source: 'deadline' as const })),
  );
