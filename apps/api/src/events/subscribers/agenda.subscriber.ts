import * as compromissoService from '../../modules/agenda/compromisso.service.js';
import { domainEventBus } from '../event-bus.js';

// Perícia cadastrada com prazo do laudo: o prazo vira compromisso na agenda.
export const registerAgendaSubscriber = (): void => {
  domainEventBus.on('pericia:created', async ({ tenantId, periciaId, numeroProcesso, prazoLaudo }) => {
    if (!prazoLaudo) return;
    await compromissoService.criarPrazoDoLaudo({ tenantId, periciaId, numeroProcesso, prazoLaudo });
  });
};
