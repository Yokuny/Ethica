import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { signinRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as authController from './auth.controller.js';
import type { AuthRouterDeps } from './auth.schema.js';
import {
  listUsersQuerySchema,
  signinSchema,
  updatePermissionsSchema,
  userDirectoryQuerySchema,
  userIdParamSchema,
} from './auth.schema.js';

// Same role (canOperate) already required in GET /conversations
// (conversation.router.ts) — /auth/users exists to feed the "assignee" filter
// of the conversation queue, so any authenticated tenant role
// that reaches the inbox can also list the user directory.
const canOperate = checkRole(['admin', 'manager', 'operator']);
// REG-07 (AD-071): e-mail and role of the whole team for admin only; /users above
// keeps only {id,name} for the assignee selectors.
const isAdmin = checkRole(['admin']);

export const createAuthRouter = (deps: AuthRouterDeps): Router => {
  const router = Router();

  router.post('/signin', signinRateLimit, validBody(signinSchema), authController.signin);
  // No validToken: signing out has to work (and clear the cookie) even with the
  // session already invalid.
  router.post('/signout', authController.signout);
  router.get('/session', deps.validToken, authController.session);
  router.get(
    '/users',
    deps.validToken,
    tenantAssignmentCheck,
    canOperate,
    validParsedQuery(listUsersQuerySchema),
    authController.listUsers,
  );
  router.get(
    '/users/directory',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    validParsedQuery(userDirectoryQuerySchema),
    authController.listUserDirectory,
  );
  // AD-137: member permission matrix, only the admin adjusts it.
  router.patch(
    '/users/:id/permissions',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    validParams(userIdParamSchema),
    validBody(updatePermissionsSchema),
    authController.updatePermissions,
  );
  // ACC-06: the photo shows up where the assignee shows up, so it follows the same role as /users.
  router.get(
    '/users/:id/avatar',
    deps.validToken,
    tenantAssignmentCheck,
    canOperate,
    validParams(userIdParamSchema),
    authController.getUserAvatar,
  );

  return router;
};
