import { Router } from 'express';
import { platformAdminOnly } from '../../middlewares/authorization.middleware.js';
import { inviteRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { validBody, validParams } from '../../middlewares/validation.middleware.js';
import { createPlatformController } from './platform.controller.js';
import type { PlatformRouterDeps } from './platform.schema.js';
import { createInviteSchema, provisionTenantSchema, tenantIdParamSchema } from './platform.schema.js';

// platformAdminOnly antes de QUALQUER outro middleware de negócio — 403 sem
// tocar dados (FND-01/AC3); validToken vem primeiro porque platformAdminOnly
// só lê req.tenantUser, já resolvido do banco.
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
