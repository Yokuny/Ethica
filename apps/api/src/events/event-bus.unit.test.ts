import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainEventBus } from './event-bus.js';
import type { PericiaCreatedPayload } from './event-types.js';

type Handler = (payload: PericiaCreatedPayload) => Promise<void>;

describe('domainEventBus', () => {
  const registered: Handler[] = [];
  const subscribe = (handler: Handler): Handler => {
    registered.push(handler);
    domainEventBus.on('pericia:created', handler);
    return handler;
  };

  afterEach(() => {
    for (const handler of registered.splice(0)) domainEventBus.off('pericia:created', handler);
    vi.restoreAllMocks();
  });

  it('delivers the exact emitted payload to the handler', () => {
    const handler = subscribe(vi.fn<Handler>().mockResolvedValue(undefined));
    const payload = { tenantId: 't1', periciaId: 'p1', numeroProcesso: '0000001-00.2026.5.02.0001' };

    domainEventBus.emit('pericia:created', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(vi.mocked(handler).mock.calls[0][0]).toBe(payload);
  });

  it('does not throw when a handler rejects, logs domain_event.handler_failed as JSON and still runs the other handlers', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    subscribe(vi.fn<Handler>().mockRejectedValue(new Error('seed exploded')));
    const healthy = subscribe(vi.fn<Handler>().mockResolvedValue(undefined));

    expect(() =>
      domainEventBus.emit('pericia:created', {
        tenantId: 't1',
        periciaId: 'p1',
        numeroProcesso: '0000001-00.2026.5.02.0001',
      }),
    ).not.toThrow();

    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1));
    expect(JSON.parse(errorSpy.mock.calls[0][0] as string)).toEqual({
      event: 'domain_event.handler_failed',
      name: 'pericia:created',
      message: 'seed exploded',
    });
    expect(healthy).toHaveBeenCalledWith({
      tenantId: 't1',
      periciaId: 'p1',
      numeroProcesso: '0000001-00.2026.5.02.0001',
    });
  });

  it('stops calling a handler after off(event, handler) with the same handler passed to on', () => {
    const handler = subscribe(vi.fn<Handler>().mockResolvedValue(undefined));
    domainEventBus.emit('pericia:created', {
      tenantId: 't1',
      periciaId: 'p1',
      numeroProcesso: '0000001-00.2026.5.02.0001',
    });
    expect(handler).toHaveBeenCalledTimes(1);

    domainEventBus.off('pericia:created', handler);
    domainEventBus.emit('pericia:created', {
      tenantId: 't2',
      periciaId: 'p2',
      numeroProcesso: '0000002-00.2026.5.02.0001',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(domainEventBus.listenerCount('pericia:created')).toBe(0);
  });
});
