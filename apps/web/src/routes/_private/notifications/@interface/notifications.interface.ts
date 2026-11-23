import { calendarDateSchema, NOTIFICATION_KINDS, NOTIFICATION_STATES } from '@ethica/contracts';
import { z } from 'zod';

// One list (AD-282): open or resolved, the "Filtros" (kind and period) and the page in the URL; the open ones by
// default.
export const notificationsSearchSchema = z.object({
  state: z.enum(NOTIFICATION_STATES).optional().default('open'),
  kind: z.array(z.enum(NOTIFICATION_KINDS)).optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
});
export type NotificationsSearch = z.infer<typeof notificationsSearchSchema>;
