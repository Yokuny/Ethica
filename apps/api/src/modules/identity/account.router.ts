import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import * as accountController from './account.controller.js';
import {
  type AccountRouterDeps,
  changePasswordSchema,
  updateAvatarSchema,
  updateProfileSchema,
} from './account.schema.js';

// ACC-05: every tenant role edits only its own account; there is no user id in the route.
const canOperate = checkRole(['admin', 'manager', 'operator']);

// Mounted on `/me` in the composition root, next to the preferences.
export const createAccountRouter = (deps: AccountRouterDeps): Router => {
  const router = Router();
  const own = [deps.validToken, tenantAssignmentCheck, canOperate];
  router.get('/profile', ...own, accountController.getProfile);
  router.patch('/profile', ...own, validBody(updateProfileSchema), accountController.updateProfile);
  router.put('/password', ...own, validBody(changePasswordSchema), accountController.changePassword);
  router.put('/avatar', ...own, validBody(updateAvatarSchema), accountController.updateAvatar);
  router.delete('/avatar', ...own, accountController.removeAvatar);
  // PRZ-03: the person's own secret iCal feed link (generating replaces the previous one).
  router.get('/calendar-feed', ...own, accountController.calendarFeedStatus);
  router.post('/calendar-feed', ...own, accountController.generateCalendarFeed);
  router.delete('/calendar-feed', ...own, accountController.revokeCalendarFeed);
  return router;
};
