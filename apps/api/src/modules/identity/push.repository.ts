import { PushSubscription } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { PushSubscriptionInput } from './push.schema.js';

// One inscription per browser (endpoint); turning it on again in another account of the same browser moves it.
export const saveSubscription = async (tenantId: string, userId: string, data: PushSubscriptionInput) =>
  withDbTiming('push.saveSubscription', async () => {
    await PushSubscription.updateOne(
      { endpoint: data.endpoint },
      { $set: { Tenant: tenantId, User: userId, keys: data.keys } },
      { upsert: true },
    );
  });

export const removeSubscription = async (userId: string, endpoint: string) =>
  withDbTiming('push.removeSubscription', async () => {
    await PushSubscription.deleteOne({ User: userId, endpoint });
  });
