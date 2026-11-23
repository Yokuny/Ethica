import * as pushRepository from './push.repository.js';
import type { PushSubscriptionInput } from './push.schema.js';

// AVS-03: the device turns push on (the inscription comes from the browser) and off (also when signing out).
export const saveSubscription = (tenantId: string, userId: string, data: PushSubscriptionInput) =>
  pushRepository.saveSubscription(tenantId, userId, data);

export const removeSubscription = (userId: string, endpoint: string) =>
  pushRepository.removeSubscription(userId, endpoint);
