import { describe, expect, it, vi } from 'vitest';
import * as lancamentoService from '../../modules/financeiro/lancamento.service.js';
import { domainEventBus } from '../event-bus.js';
import { registerAllSubscribers } from './index.js';

vi.mock('../../modules/financeiro/lancamento.service.js', () => ({
  lancarHonorariosFixados: vi.fn().mockResolvedValue(undefined),
}));

const PERICIA = { tenantId: 't1', periciaId: 'p1', numeroProcesso: '0000001-00.2026.5.02.0001' };

describe('registerAllSubscribers', () => {
  it('is idempotent: two calls leave a single listener per event', () => {
    registerAllSubscribers();
    registerAllSubscribers();

    expect(domainEventBus.listenerCount('pericia:honorarios_fixados')).toBe(1);
  });

  it('pericia:honorarios_fixados lança a receita a receber', async () => {
    registerAllSubscribers();

    domainEventBus.emit('pericia:honorarios_fixados', {
      ...PERICIA,
      valorCents: 350_000,
      categoria: 'fixed_fees' as const,
    });

    await vi.waitFor(() =>
      expect(lancamentoService.lancarHonorariosFixados).toHaveBeenCalledWith({
        ...PERICIA,
        valorCents: 350_000,
        categoria: 'fixed_fees' as const,
      }),
    );
  });
});
