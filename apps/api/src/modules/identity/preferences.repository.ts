import { HOME_BLOCKS, type HomeBlock, type NotificationPreferences, wantsChannel } from '@ethica/contracts';
import { tenantScoped, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PREFERENCE_TOPICS,
  type UpdatePreferences,
  type UserPreferences,
} from './preferences.schema.js';

const matrixOf = (saved?: NotificationPreferences): UserPreferences['notifications'] =>
  Object.fromEntries(
    NOTIFICATION_PREFERENCE_TOPICS.map((topic) => [
      topic,
      Object.fromEntries(NOTIFICATION_CHANNELS.map((channel) => [channel, wantsChannel(saved, topic, channel)])),
    ]),
  ) as UserPreferences['notifications'];

// `notifications.deadlines.email` and so on: one $set per cell, never the whole matrix.
const flatten = (data: UpdatePreferences): [string, unknown][] =>
  Object.entries(data).flatMap(([key, value]) =>
    key === 'notifications' && value && typeof value === 'object'
      ? Object.entries(value).flatMap(([topic, channels]) =>
          Object.entries(channels ?? {}).map(
            ([channel, on]) => [`notifications.${topic}.${channel}`, on] as [string, unknown],
          ),
        )
      : [[key, value] as [string, unknown]],
  );

const toPreferences = (
  doc: {
    preferences?: {
      onboardingDismissed?: boolean;
      notifications?: NotificationPreferences;
      hiddenBlocks?: string[];
    };
  } | null,
): UserPreferences => ({
  onboardingDismissed: doc?.preferences?.onboardingDismissed === true,
  notifications: matrixOf(doc?.preferences?.notifications),
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
          flatten(data)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [`preferences.${key}`, value]),
        ),
      },
      { returnDocument: 'after' },
    )
      .select('preferences')
      .lean();
    return doc ? toPreferences(doc) : null;
  });
