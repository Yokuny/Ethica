import { Router } from 'express';
import { isAdmin } from '../../middlewares/authorization.middleware.js';
import { inviteRateLimit } from '../../middlewares/rate-limit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenant-assign.middleware.js';
import { validBody, validParams } from '../../middlewares/validation.middleware.js';
import * as inviteController from './invite.controller.js';
import {
  acceptInviteSchema,
  createInviteSchema,
  type InviteRouterDeps,
  inviteTokenParamSchema,
} from './invite.schema.js';

// `/invites` — fully public, no validToken here (FND-03/AC1).
export const createInviteRouter = (): Router => {
  const router = Router();
  router.get('/:token', validParams(inviteTokenParamSchema), inviteController.peekInvite);
  router.post(
    '/:token/accept',
    validParams(inviteTokenParamSchema),
    validBody(acceptInviteSchema),
    inviteController.acceptInvite,
  );
  return router;
};

// `/tenant` — the office admin invites a team member.
export const createTeamInviteRouter = (deps: InviteRouterDeps): Router => {
  const router = Router();
  router.post(
    '/invites',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    inviteRateLimit,
    validBody(createInviteSchema),
    inviteController.inviteTeamMember(deps),
  );
  return router;
};
