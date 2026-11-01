import { describe, expect, it, vi } from 'vitest';
import * as transactionService from '../../modules/finance/transaction.service.js';
import { domainEventBus } from '../event-bus.js';
import { registerAllSubscribers } from './index.js';

vi.mock('../../modules/finance/transaction.service.js', () => ({
  postFixedFees: vi.fn().mockResolvedValue(undefined),
}));

const CASE = { tenantId: 't1', caseId: 'p1', processNumber: '0000001-00.2026.5.02.0001' };

describe('registerAllSubscribers', () => {
  it('is idempotent: two calls leave a single listener per event', () => {
    registerAllSubscribers();
    registerAllSubscribers();

    expect(domainEventBus.listenerCount('case:fixed_fees')).toBe(1);
  });

  it('pericia:honorarios_fixados lança a receita a receber', async () => {
    registerAllSubscribers();

    domainEventBus.emit('case:fixed_fees', {
      ...CASE,
      amountCents: 350_000,
      category: 'fixed_fees' as const,
    });

    await vi.waitFor(() =>
      expect(transactionService.postFixedFees).toHaveBeenCalledWith({
        ...CASE,
        amountCents: 350_000,
        category: 'fixed_fees' as const,
      }),
    );
  });
});
