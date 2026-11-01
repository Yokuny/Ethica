import { z } from 'zod';
import type { CaseSummary } from '../case/case.schema.js';
import type { DeadlineRecord } from '../case/deadline.schema.js';
import type { CompromissoRecord } from './compromisso.schema.js';

// Token do link do feed iCal: 32 bytes aleatórios em hex (identity/account.service.ts).
export const feedTokenParamSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'link inválido') }).strict();

export type FeedEntrada = {
  compromissos: CompromissoRecord[];
  deadlines: DeadlineRecord[];
  resumos: Map<string, CaseSummary>;
  now: Date;
};
