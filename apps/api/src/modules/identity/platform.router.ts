import { Router } from 'express';
import { platformAdminOnly } from '../../middlewares/authorization.middleware.js';
import { inviteRateLimit } from '../../middlewares/rate-limit.middleware.js';
import { validBody, validParams } from '../../middlewares/validation.middleware.js';
import * as inviteController from './invite.controller.js';
import { createInviteSchema } from './invite.schema.js';
import * as platformController from './platform.controller.js';
import type { PlatformRouterDeps } from './platform.schema.js';
import { provisionTenantSchema, tenantIdParamSchema } from './platform.schema.js';

// platformAdminOnly before ANY other business middleware — 403 without
// touching data (FND-01/AC3); validToken comes first because platformAdminOnly
// only reads req.tenantUser, already resolved from the database.
export const createPlatformRouter = (deps: PlatformRouterDeps): Router => {
  const router = Router();

  router.post(
    '/tenants',
    deps.validToken,
    platformAdminOnly,
    validBody(provisionTenantSchema),
    platformController.provisionTenant,
  );

  router.post(
    '/tenants/:id/invites',
    deps.validToken,
    platformAdminOnly,
    inviteRateLimit,
    validParams(tenantIdParamSchema),
    validBody(createInviteSchema),
    inviteController.inviteToTenant(deps),
  );

  return router;
};
