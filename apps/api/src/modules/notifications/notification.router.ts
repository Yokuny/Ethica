import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as notificationController from './notification.controller.js';
import {
  createNotificationSchema,
  listNoticesQuerySchema,
  listNotificationsQuerySchema,
  type NotificationRouterDeps,
  notificationIdParamSchema,
  updateNotificationSchema,
} from './notification.schema.js';

// Central (AD-263). Deadlines and alerts follow the cases permission (AD-137), as they did inside the
// case: adding, changing or removing one is changing the case; the agenda gets them by event (AD-169).
export const createNotificationRouter = (deps: NotificationRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const byId = validParams(notificationIdParamSchema);

  router.get(
    '/',
    ...guard,
    can('expert_cases', 'view'),
    validParsedQuery(listNotificationsQuerySchema),
    notificationController.listNotifications,
  );
  // Bell and notices (CNT-04): any person of the office; each one sees the modules they can view (D5).
  router.get('/notices', ...guard, validParsedQuery(listNoticesQuerySchema), notificationController.listNotices);
  router.get('/unread-count', ...guard, notificationController.countUnread);
  router.post('/read-all', ...guard, notificationController.markAllRead);
  router.post('/:id/read', ...guard, byId, notificationController.markRead);
  router.post(
    '/',
    ...guard,
    can('expert_cases', 'update'),
    validBody(createNotificationSchema),
    notificationController.createNotification,
  );
  router.patch(
    '/:id',
    ...guard,
    can('expert_cases', 'update'),
    byId,
    validBody(updateNotificationSchema),
    notificationController.updateNotification,
  );
  router.delete('/:id', ...guard, can('expert_cases', 'update'), byId, notificationController.deleteNotification);
  return router;
};
