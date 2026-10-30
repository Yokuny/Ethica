import { describe, expect, it, vi } from 'vitest';
import * as compromissoService from '../../modules/agenda/compromisso.service.js';
import * as lancamentoService from '../../modules/financeiro/lancamento.service.js';
import { domainEventBus } from '../event-bus.js';
import { registerAllSubscribers } from './index.js';

vi.mock('../../modules/agenda/compromisso.service.js', () => ({
  criarPrazoDoLaudo: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/financeiro/lancamento.service.js', () => ({
  lancarHonorariosFixados: vi.fn().mockResolvedValue(undefined),
}));

const PERICIA = { tenantId: 't1', periciaId: 'p1', numeroProcesso: '0000001-00.2026.5.02.0001' };

describe('registerAllSubscribers', () => {
  it('is idempotent: two calls leave a single listener per event', () => {
    registerAllSubscribers();
    registerAllSubscribers();

    expect(domainEventBus.listenerCount('pericia:created')).toBe(1);
    expect(domainEventBus.listenerCount('pericia:honorarios_fixados')).toBe(1);
  });

  it('pericia:created com prazo cria o compromisso de entrega do laudo; sem prazo não cria nada', async () => {
    registerAllSubscribers();

    domainEventBus.emit('pericia:created', PERICIA);
    domainEventBus.emit('pericia:created', { ...PERICIA, prazoLaudo: '2026-11-30' });

    await vi.waitFor(() => expect(compromissoService.criarPrazoDoLaudo).toHaveBeenCalledTimes(1));
    expect(compromissoService.criarPrazoDoLaudo).toHaveBeenCalledWith({ ...PERICIA, prazoLaudo: '2026-11-30' });
  });

  it('pericia:honorarios_fixados lança a receita a receber', async () => {
    registerAllSubscribers();

    domainEventBus.emit('pericia:honorarios_fixados', { ...PERICIA, valorCents: 350_000 });

    await vi.waitFor(() =>
      expect(lancamentoService.lancarHonorariosFixados).toHaveBeenCalledWith({ ...PERICIA, valorCents: 350_000 }),
    );
  });
});
