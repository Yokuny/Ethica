import * as lancamentoService from '../../modules/financeiro/lancamento.service.js';
import { domainEventBus } from '../event-bus.js';

// Honorários fixados pelo juízo: viram receita a receber no financeiro.
export const registerFinanceiroSubscriber = (): void => {
  domainEventBus.on('pericia:honorarios_fixados', async (payload) => {
    await lancamentoService.lancarHonorariosFixados(payload);
  });
};
