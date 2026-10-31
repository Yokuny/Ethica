import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainEventBus } from './event-bus.js';
import type { PericiaHonorariosFixadosPayload } from './event-types.js';

type Handler = (payload: PericiaHonorariosFixadosPayload) => Promise<void>;

describe('domainEventBus', () => {
  const registered: Handler[] = [];
  const subscribe = (handler: Handler): Handler => {
    registered.push(handler);
    domainEventBus.on('pericia:honorarios_fixados', handler);
    return handler;
  };

  afterEach(() => {
    for (const handler of registered.splice(0)) domainEventBus.off('pericia:honorarios_fixados', handler);
    vi.restoreAllMocks();
  });

  it('delivers the exact emitted payload to the handler', () => {
    const handler = subscribe(vi.fn<Handler>().mockResolvedValue(undefined));
    const payload = {
      tenantId: 't1',
      periciaId: 'p1',
      numeroProcesso: '0000001-00.2026.5.02.0001',
      valorCents: 100_000,
    };

    domainEventBus.emit('pericia:honorarios_fixados', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(vi.mocked(handler).mock.calls[0][0]).toBe(payload);
  });

  it('does not throw when a handler rejects, logs domain_event.handler_failed as JSON and still runs the other handlers', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    subscribe(vi.fn<Handler>().mockRejectedValue(new Error('seed exploded')));
    const healthy = subscribe(vi.fn<Handler>().mockResolvedValue(undefined));

    expect(() =>
      domainEventBus.emit('pericia:honorarios_fixados', {
        tenantId: 't1',
        periciaId: 'p1',
        numeroProcesso: '0000001-00.2026.5.02.0001',
        valorCents: 100_000,
      }),
    ).not.toThrow();

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1));
    expect(JSON.parse(errorSpy.mock.calls[0][0] as string)).toEqual({
      event: 'domain_event.handler_failed',
      name: 'pericia:honorarios_fixados',
      message: 'seed exploded',
    });
    expect(healthy).toHaveBeenCalledWith({
      tenantId: 't1',
      periciaId: 'p1',
      numeroProcesso: '0000001-00.2026.5.02.0001',
      valorCents: 100_000,
    });
  });

  it('stops calling a handler after off(event, handler) with the same handler passed to on', () => {
    const handler = subscribe(vi.fn<Handler>().mockResolvedValue(undefined));
    domainEventBus.emit('pericia:honorarios_fixados', {
      tenantId: 't1',
      periciaId: 'p1',
      numeroProcesso: '0000001-00.2026.5.02.0001',
      valorCents: 100_000,
    });
    expect(handler).toHaveBeenCalledTimes(1);

    domainEventBus.off('pericia:honorarios_fixados', handler);
    domainEventBus.emit('pericia:honorarios_fixados', {
      tenantId: 't2',
      periciaId: 'p2',
      numeroProcesso: '0000002-00.2026.5.02.0001',
      valorCents: 100_000,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(domainEventBus.listenerCount('pericia:honorarios_fixados')).toBe(0);
  });
});
