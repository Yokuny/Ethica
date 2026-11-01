import * as lancamentoService from '../../modules/financeiro/lancamento.service.js';
import { domainEventBus } from '../event-bus.js';

// Honorários fixados pelo juízo: viram receita a receber no financeiro.
export const registerFinanceiroSubscriber = (): void => {
  domainEventBus.on('case:fixed_fees', async (payload) => {
    await lancamentoService.postFixedFees(payload);
  });
};
