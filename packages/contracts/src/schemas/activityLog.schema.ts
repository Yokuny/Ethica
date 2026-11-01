import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

// Activity log (AD-134): recorded modules and actions. English keys, translated on the web (AD-113).
export const ACTIVITY_LOG_MODULES = [
  'expert_cases',
  'parties',
  'agenda',
  'expert_reports',
  'report_templates',
  'finance',
  'prospecting',
  'office',
  'users',
  'account',
] as const;
export type ActivityLogModule = (typeof ACTIVITY_LOG_MODULES)[number];

export const ACTIVITY_LOG_ACTIONS = [
  'create',
  'update',
  'delete',
  'complete',
  'convert',
  'import',
  'export',
  'notify',
  'signin',
] as const;
export type ActivityLogAction = (typeof ACTIVITY_LOG_ACTIONS)[number];

export const listActivityLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
    userId: idSchema.optional(),
    module: z.enum(ACTIVITY_LOG_MODULES).optional(),
    action: z.enum(ACTIVITY_LOG_ACTIONS).optional(),
  })
  .strict();
export type ListActivityLogQuery = z.infer<typeof listActivityLogQuerySchema>;
