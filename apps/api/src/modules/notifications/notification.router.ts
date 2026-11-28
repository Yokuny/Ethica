import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenant-assign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as notificationController from './notification.controller.js';
import {
  acceptSuggestionSchema,
  createNotificationSchema,
  listNotificationsQuerySchema,
  type NotificationRouterDeps,
  notificationIdParamSchema,
  rejectSuggestionSchema,
  updateNotificationSchema,
} from './notification.schema.js';

// Central (AD-263). Deadlines and alerts follow the cases permission (AD-137), as they did inside the
// case: adding, changing or removing one is changing the case; the agenda gets them by event (AD-169).
export const createNotificationRouter = (deps: NotificationRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const byId = validParams(notificationIdParamSchema);

  // One list and one counter for every kind (AD-282): any person of the office, each one sees the modules they can
  // view (D5); deadlines and alerts are of the cases module.
  router.get('/', ...guard, validParsedQuery(listNotificationsQuerySchema), notificationController.listNotifications);
  router.get('/count', ...guard, notificationController.countDue);
  // Accepting and rejecting check the permission of the suggestion module in the service (D5).
  router.post(
    '/:id/accept',
    ...guard,
    byId,
    validBody(acceptSuggestionSchema),
    notificationController.acceptSuggestion,
  );
  router.post(
    '/:id/reject',
    ...guard,
    byId,
    validBody(rejectSuggestionSchema),
    notificationController.rejectSuggestion,
  );
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
