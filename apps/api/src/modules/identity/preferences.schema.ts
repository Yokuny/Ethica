import { HOME_BLOCKS, type HomeBlock } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type PreferencesRouterDeps = { validToken: RequestHandler };

// ENR-03: the person's own choices — dismissing the getting started guide and (AD-110)
// getting the daily deadline reminder by e-mail. Checklist progress is never saved here.
// Strict: any other key (including Tenant, AD-010) is rejected; empty too.
export const updatePreferencesSchema = z
  .object({
    onboardingDismissed: z.boolean().optional(),
    deadlineReminderEmail: z.boolean().optional(),
    // AD-136: home blocks the person hid; `[]` restores the default.
    hiddenBlocks: z.array(z.enum(HOME_BLOCKS)).max(HOME_BLOCKS.length).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'nenhuma preferência informada' });

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type UserPreferences = {
  onboardingDismissed: boolean;
  deadlineReminderEmail: boolean;
  hiddenBlocks: HomeBlock[];
};
