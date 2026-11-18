import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import * as billingController from './billing.controller.js';
import { type BillingRouterDeps, billingPaySchema } from './billing.schema.js';

const canOperate = checkRole(['admin', 'manager', 'operator']);
// CHK-07: only the admin pays the office subscription.
const isAdmin = checkRole(['admin']);

// AD-230: `validSession` (not validToken) — these routes are what a closed office still reaches.
export const createBillingRouter = (deps: BillingRouterDeps): Router => {
  const router = Router();
  router.get('/', deps.validSession, tenantAssignmentCheck, canOperate, billingController.getBilling);
  router.post(
    '/pay',
    deps.validSession,
    tenantAssignmentCheck,
    isAdmin,
    validBody(billingPaySchema),
    billingController.pay(deps),
  );
  // Public: Asaas calls it with the token of the `asaas-access-token` header.
  router.post('/webhook', billingController.webhook(deps));
  return router;
};
