import { Router } from 'express';
import { isAdmin } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenant-assign.middleware.js';
import { validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as activityLogController from './activity-log.controller.js';
import { type ActivityLogRouterDeps, listActivityLogQuerySchema } from './activity-log.schema.js';

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
