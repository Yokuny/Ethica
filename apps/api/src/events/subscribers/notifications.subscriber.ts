import * as notificationService from '../../modules/notifications/notification.service.js';
import { domainEventBus } from '../event-bus.js';

// The delivery deadline of a new case (AD-264) and, with a deleted case, its notifications.
export const registerNotificationsSubscriber = (): void => {
  domainEventBus.on('case:created', async ({ tenantId, caseId, delivery }) => {
    if (delivery) await notificationService.createDeliveryDue(tenantId, caseId, delivery);
  });
  domainEventBus.on('case:deleted', async ({ tenantId, caseId }) => {
    await notificationService.deleteByCase(tenantId, caseId);
  });
};
