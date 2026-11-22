import {
  HOME_BLOCKS,
  type HomeBlock,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PREFERENCE_TOPICS,
  type NotificationChannel,
  type NotificationPreferenceTopic,
  notificationPreferencesSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type PreferencesRouterDeps = { validToken: RequestHandler };

// ENR-03: the person's own choices — having seen the guided tour (AD-233) and (CNT-05) which notifications
// reach them by which channel. Checklist progress is never saved here.
// Strict: any other key (including Tenant, AD-010) is rejected; empty too.
export const updatePreferencesSchema = z
  .object({
    onboardingDismissed: z.boolean().optional(),
    // CNT-05: only the cells sent change; the others keep their value.
    notifications: notificationPreferencesSchema.optional(),
    // AD-136: home blocks the person hid; `[]` restores the default.
    hiddenBlocks: z.array(z.enum(HOME_BLOCKS)).max(HOME_BLOCKS.length).optional(),
    // MRA-04: follow the revenue goal on the services page.
    revenueGoalOnCases: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'nenhuma preferência informada' });

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type UserPreferences = {
  onboardingDismissed: boolean;
  // Every cell resolved (missing = on).
  notifications: Record<NotificationPreferenceTopic, Record<NotificationChannel, boolean>>;
  hiddenBlocks: HomeBlock[];
  revenueGoalOnCases: boolean;
};

export { NOTIFICATION_CHANNELS, NOTIFICATION_PREFERENCE_TOPICS };
