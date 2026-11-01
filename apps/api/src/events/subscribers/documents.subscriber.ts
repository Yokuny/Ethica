import * as reportService from '../../modules/documents/report.service.js';
import { domainEventBus } from '../event-bus.js';

// Case deleted: its reports go with it (AD-126).
export const registerDocumentsSubscriber = (): void => {
  domainEventBus.on('case:deleted', async ({ tenantId, caseId }) => {
    await reportService.deleteByCase(tenantId, caseId);
  });
};
