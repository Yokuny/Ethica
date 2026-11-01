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

// ACC-05: todo papel do tenant edita só a própria conta; não há id de usuário na rota.
const canOperate = checkRole(['admin', 'manager', 'operator']);

// Montado em `/me` no composition root, ao lado das preferências.
export const createAccountRouter = (deps: AccountRouterDeps): Router => {
  const router = Router();
  const own = [deps.validToken, tenantAssignmentCheck, canOperate];
  router.get('/profile', ...own, accountController.getProfile);
  router.patch('/profile', ...own, validBody(updateProfileSchema), accountController.updateProfile);
  router.put('/password', ...own, validBody(changePasswordSchema), accountController.changePassword);
  router.put('/avatar', ...own, validBody(updateAvatarSchema), accountController.updateAvatar);
  router.delete('/avatar', ...own, accountController.removeAvatar);
  // PRZ-03: link secreto do feed iCal da própria pessoa (gerar substitui o anterior).
  router.get('/calendar-feed', ...own, accountController.calendarFeedStatus);
  router.post('/calendar-feed', ...own, accountController.generateCalendarFeed);
  router.delete('/calendar-feed', ...own, accountController.revogarCalendarFeed);
  return router;
};
