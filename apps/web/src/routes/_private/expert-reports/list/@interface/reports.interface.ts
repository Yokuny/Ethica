import { REPORT_STATUS } from '@ethica/contracts';
import { z } from 'zod';

export const reportsSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  status: z.enum(REPORT_STATUS).optional(),
});
export type ReportsSearch = z.infer<typeof reportsSearchSchema>;
