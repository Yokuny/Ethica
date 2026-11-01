import * as transactionService from '../../modules/finance/transaction.service.js';
import { domainEventBus } from '../event-bus.js';

// Honorários fixados pelo juízo: viram receita a receber no financeiro.
export const registerFinanceSubscriber = (): void => {
  domainEventBus.on('case:fixed_fees', async (payload) => {
    await transactionService.postFixedFees(payload);
  });
};
