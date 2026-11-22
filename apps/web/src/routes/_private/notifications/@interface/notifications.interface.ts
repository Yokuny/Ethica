import { z } from 'zod';

// Central (AD-189, AD-263): situation and page in the URL; the pending ones by default.
export const notificationsSearchSchema = z.object({
  // Deadlines and alerts, or the notices of the bell (CNT-04).
  view: z.enum(['dated', 'notices']).optional().default('dated'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
  status: z.enum(['pending', 'filed', 'missed', 'done', 'canceled']).optional().default('pending'),
});
export type NotificationsSearch = z.infer<typeof notificationsSearchSchema>;
