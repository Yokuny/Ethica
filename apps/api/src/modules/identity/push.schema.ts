import type { PushSubscriptionInput } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export { pushSubscriptionSchema, pushUnsubscribeSchema } from '@ethica/contracts';
export type { PushSubscriptionInput };

// `publicKey` absent = push not configured (no VAPID key): the account does not offer it (AVS-03).
export type PushRouterDeps = { validToken: RequestHandler; publicKey?: string };
