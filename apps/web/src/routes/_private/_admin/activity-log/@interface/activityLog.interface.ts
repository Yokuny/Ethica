import { ACTIVITY_LOG_ACTIONS, ACTIVITY_LOG_MODULES } from '@ethica/contracts';
import { z } from 'zod';

export const activityLogSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().optional(),
  module: z.enum(ACTIVITY_LOG_MODULES).optional(),
  action: z.enum(ACTIVITY_LOG_ACTIONS).optional(),
});
export type ActivityLogSearch = z.infer<typeof activityLogSearchSchema>;
