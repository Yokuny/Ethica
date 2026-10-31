import * as laudoService from '../../modules/documentos/laudo.service.js';
import { domainEventBus } from '../event-bus.js';

// Perícia excluída: os laudos dela saem junto (AD-126).
export const registerDocumentosSubscriber = (): void => {
  domainEventBus.on('pericia:deleted', async ({ tenantId, periciaId }) => {
    await laudoService.deleteByPericia(tenantId, periciaId);
  });
};
