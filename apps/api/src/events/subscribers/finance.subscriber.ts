import * as transactionService from '../../modules/finance/transaction.service.js';
import { domainEventBus } from '../event-bus.js';

// Fees fixed by the court: they become receivable income in finance.
export const registerFinanceSubscriber = (): void => {
  domainEventBus.on('case:fixed_fees', async (payload) => {
    await transactionService.postFixedFees(payload);
  });
};
