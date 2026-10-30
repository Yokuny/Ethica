import { Router } from 'express';
import { isAdmin } from '../../middlewares/authorization.middleware.js';
import { inviteRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import { createInviteSchema, type PlatformRouterDeps } from './platform.schema.js';
import { createTenantInviteController } from './tenantInvite.controller.js';

export const createTenantInviteRouter = (deps: PlatformRouterDeps): Router => {
  const router = Router();
  const controller = createTenantInviteController(deps);
  router.post(
    '/invites',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    inviteRateLimit,
    validBody(createInviteSchema),
    controller.inviteTeamMember,
  );
  return router;
};
