import { Router } from 'express';
import { platformAdminOnly } from '../../middlewares/authorization.middleware.js';
import { inviteRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { validBody, validParams } from '../../middlewares/validation.middleware.js';
import { createPlatformController } from './platform.controller.js';
import type { PlatformRouterDeps } from './platform.schema.js';
import { createInviteSchema, provisionTenantSchema, tenantIdParamSchema } from './platform.schema.js';

// platformAdminOnly before ANY other business middleware — 403 without
// touching data (FND-01/AC3); validToken comes first because platformAdminOnly
// only reads req.tenantUser, already resolved from the database.
export const createPlatformRouter = (deps: PlatformRouterDeps): Router => {
  const controller = createPlatformController(deps);
  const router = Router();

  router.post(
    '/tenants',
    deps.validToken,
    platformAdminOnly,
    validBody(provisionTenantSchema),
    controller.provisionTenant,
  );

  router.post(
    '/tenants/:id/invites',
    deps.validToken,
    platformAdminOnly,
    inviteRateLimit,
    validParams(tenantIdParamSchema),
    validBody(createInviteSchema),
    controller.inviteToTenant,
  );

  return router;
};
