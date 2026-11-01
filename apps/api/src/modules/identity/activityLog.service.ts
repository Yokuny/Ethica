import { wallClockToUtc } from '@ethica/db';
import * as activityLogRepository from './activityLog.repository.js';
import type { ListActivityLogQuery, NewActivity } from './activityLog.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Never brings down the action of whoever generated the entry (GES-01.4): the failure only goes to the log.
export const record = async (activity: NewActivity): Promise<void> => {
  try {
    await activityLogRepository.record(activity);
  } catch (e) {
    console.error(
      JSON.stringify({ event: 'activityLog.record_failed', message: e instanceof Error ? e.message : String(e) }),
    );
  }
};

// `from`/`to` are calendar days (AD-103), inclusive: the end goes up to the start of the next day.
export const listActivities = (tenantId: string, query: ListActivityLogQuery) =>
  activityLogRepository.listActivities(tenantId, query, {
    from: query.from ? wallClockToUtc(query.from, '00:00') : undefined,
    to: query.to ? new Date(wallClockToUtc(query.to, '00:00').getTime() + DAY_MS) : undefined,
  });

export const latestExports = (tenantId: string, limit: number) => activityLogRepository.latestExports(tenantId, limit);
