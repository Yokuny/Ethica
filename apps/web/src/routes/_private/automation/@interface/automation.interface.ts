import { SORT_ORDERS, TRACKED_CASE_SORTS, TRACKED_CASE_STATUSES } from '@ethica/contracts';
import { z } from 'zod';
import { periodSchema } from '@/lib/helpers/period.helper.js';

// The Automação panel (PAT-02, PAT-03): the period of the whole page and the list of tracked cases (search, situation,
// column sort and page), all in the URL.
export const automationSearchSchema = z.object({
  months: periodSchema,
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  state: z.array(z.enum(TRACKED_CASE_STATUSES)).optional(),
  sort: z.enum(TRACKED_CASE_SORTS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
});
export type AutomationSearch = z.infer<typeof automationSearchSchema>;
