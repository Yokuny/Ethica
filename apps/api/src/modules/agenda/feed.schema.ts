import { z } from 'zod';
import type { CaseSummary } from '../case/case.schema.js';
import type { DeadlineRecord } from '../case/deadline.schema.js';
import type { AppointmentRecord } from './appointment.schema.js';

// Token do link do feed iCal: 32 bytes aleatórios em hex (identity/account.service.ts).
export const feedTokenParamSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'link inválido') }).strict();

export type FeedEntrada = {
  appointments: AppointmentRecord[];
  deadlines: DeadlineRecord[];
  resumos: Map<string, CaseSummary>;
  now: Date;
};
