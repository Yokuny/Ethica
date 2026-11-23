import { NOTIFICATION_STATES } from '@ethica/contracts';
import { z } from 'zod';

// One list (AD-282): open or resolved and the page in the URL; the open ones by default.
export const notificationsSearchSchema = z.object({
  state: z.enum(NOTIFICATION_STATES).optional().default('open'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
});
export type NotificationsSearch = z.infer<typeof notificationsSearchSchema>;
