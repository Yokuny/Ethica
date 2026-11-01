import { HOME_BLOCKS, type HomeBlock } from '@ethica/contracts';
import { tenantScoped, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { UpdatePreferences, UserPreferences } from './preferences.schema.js';

const toPreferences = (
  doc: {
    preferences?: { onboardingDismissed?: boolean; deadlineReminderEmail?: boolean; hiddenBlocks?: string[] };
  } | null,
): UserPreferences => ({
  onboardingDismissed: doc?.preferences?.onboardingDismissed === true,
  deadlineReminderEmail: doc?.preferences?.deadlineReminderEmail !== false,
  // A key that no longer exists is ignored (AD-136).
  hiddenBlocks: (doc?.preferences?.hiddenBlocks ?? []).filter((block): block is HomeBlock =>
    (HOME_BLOCKS as readonly string[]).includes(block),
  ),
});

// A user without the field (account older than the feature) reads the default, no backfill.
export const findPreferences = async (tenantId: string, userId: string): Promise<UserPreferences | null> =>
  withDbTiming('preferences.findPreferences', async () => {
    const doc = await User.findOne(tenantScoped({ Tenant: tenantId, _id: userId }))
      .select('preferences')
      .lean();
    return doc ? toPreferences(doc) : null;
  });

// $set per key: a new preference in the future does not wipe the others.
export const updatePreferences = async (
  tenantId: string,
  userId: string,
  data: UpdatePreferences,
): Promise<UserPreferences | null> =>
  withDbTiming('preferences.updatePreferences', async () => {
    const doc = await User.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: userId }),
      {
        $set: Object.fromEntries(
          Object.entries(data)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [`preferences.${key}`, value]),
        ),
      },
      { new: true },
    )
      .select('preferences')
      .lean();
    return doc ? toPreferences(doc) : null;
  });
