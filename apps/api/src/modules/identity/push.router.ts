import { respObj } from '@ethica/contracts';
import { Router } from 'express';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as pushController from './push.controller.js';
import { type PushRouterDeps, pushSubscriptionSchema, pushUnsubscribeSchema } from './push.schema.js';

// Mounted on `/me`: each person only touches the inscriptions of their own devices (AVS-03).
export const createPushRouter = (deps: PushRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  router.get('/push', ...guard, (_req, res) => {
    res.json(respObj({ data: { publicKey: deps.publicKey } }));
  });
  router.post('/push-subscriptions', ...guard, validBody(pushSubscriptionSchema), pushController.saveSubscription);
  router.delete(
    '/push-subscriptions',
    ...guard,
    validParsedQuery(pushUnsubscribeSchema),
    pushController.removeSubscription,
  );
  return router;
};
