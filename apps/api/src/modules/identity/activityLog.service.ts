import { wallClockToUtc } from '@ethica/db';
import * as activityLogRepository from './activityLog.repository.js';
import type { ListActivityLogQuery, NewActivity } from './activityLog.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Nunca derruba a ação de quem gerou a entrada (GES-01.4): a falha só vai ao log.
export const record = async (activity: NewActivity): Promise<void> => {
  try {
    await activityLogRepository.record(activity);
  } catch (e) {
    console.error(
      JSON.stringify({ event: 'activityLog.record_failed', message: e instanceof Error ? e.message : String(e) }),
    );
  }
};

// `from`/`to` são dias de calendário (AD-103), inclusivos: o fim vai até o início do dia seguinte.
export const listActivities = (tenantId: string, query: ListActivityLogQuery) =>
  activityLogRepository.listActivities(tenantId, query, {
    from: query.from ? wallClockToUtc(query.from, '00:00') : undefined,
    to: query.to ? new Date(wallClockToUtc(query.to, '00:00').getTime() + DAY_MS) : undefined,
  });

export const latestExports = (tenantId: string, limit: number) => activityLogRepository.latestExports(tenantId, limit);
