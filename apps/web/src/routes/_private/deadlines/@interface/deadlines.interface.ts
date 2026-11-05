import { DEADLINE_STATUS } from '@ethica/contracts';
import { z } from 'zod';

// "Prazos e Alertas" (AD-189): situation and page in the URL; the pending ones by default.
export const deadlinesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  status: z.enum(DEADLINE_STATUS).optional().default('pending'),
});
export type DeadlinesSearch = z.infer<typeof deadlinesSearchSchema>;
