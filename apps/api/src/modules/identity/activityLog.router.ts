import { Router } from 'express';
import { isAdmin } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as activityLogController from './activityLog.controller.js';
import { type ActivityLogRouterDeps, listActivityLogQuerySchema } from './activityLog.schema.js';

// Activity log (AD-134): only the admin queries it. Mounted on `/tenant/activity-log`.
export const createActivityLogRouter = (deps: ActivityLogRouterDeps): Router => {
  const router = Router();
  router.get(
    '/',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    validParsedQuery(listActivityLogQuerySchema),
    activityLogController.listActivities,
  );
  return router;
};
