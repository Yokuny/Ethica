import { REPORT_LIST_SORTS, REPORT_STATUS, SORT_ORDERS } from '@ethica/contracts';
import { z } from 'zod';

export const reportsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
  status: z.enum(REPORT_STATUS).optional(),
  sort: z.enum(REPORT_LIST_SORTS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
});
export type ReportsSearch = z.infer<typeof reportsSearchSchema>;
