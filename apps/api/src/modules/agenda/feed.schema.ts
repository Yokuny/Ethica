import { z } from 'zod';
import type { CaseSummary } from '../case/case.schema.js';
import type { DatedNotification } from '../notifications/notification.schema.js';
import type { AppointmentRecord } from './appointment.schema.js';

// iCal feed link token: 32 random bytes in hex (identity/account.service.ts).
export const feedTokenParamSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'link inválido') }).strict();

export type FeedEntry = {
  appointments: AppointmentRecord[];
  deadlines: DatedNotification[];
  summaries: Map<string, CaseSummary>;
  now: Date;
};
