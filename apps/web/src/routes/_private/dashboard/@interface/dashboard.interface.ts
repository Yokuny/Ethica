import { z } from 'zod';
import { periodSchema } from '@/lib/helpers/period.helper.js';

export const dashboardSearchSchema = z.object({
  months: periodSchema,
  // Year of the revenue goal panel (AD-259); missing = the current one.
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  // Month (`YYYY-MM`) of the services mix; missing = every service since the start.
  mix: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .catch(undefined),
});
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
