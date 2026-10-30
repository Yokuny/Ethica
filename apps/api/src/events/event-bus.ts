import { EventEmitter } from 'node:events';
import type { DomainEventMap, DomainEventName } from './event-types.js';

type DomainEventHandler<T extends DomainEventName> = (payload: DomainEventMap[T]) => Promise<void>;
type Listener = (payload: unknown) => void;

// Fire-and-forget : a falha de um handler nunca chega ao emissor —
// é logada no mesmo formato JSON do errorHandler.middleware.ts.
class DomainEventBus {
  private emitter = new EventEmitter();
  // O EventEmitter registra o wrapper, não o handler: guardar o wrapper por
  // (evento, handler) é o que permite `off` com o mesmo handler passado a `on`.
  private listeners = new Map<DomainEventName, Map<unknown, Listener>>();

  emit<T extends DomainEventName>(event: T, payload: DomainEventMap[T]): void {
    this.emitter.emit(event, payload);
  }

  on<T extends DomainEventName>(event: T, handler: DomainEventHandler<T>): void {
    const listener: Listener = (payload) => {
      handler(payload as DomainEventMap[T]).catch((err: unknown) => {
        console.error(
          JSON.stringify({
            event: 'domain_event.handler_failed',
            name: event,
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      });
    };

    const byHandler = this.listeners.get(event) ?? new Map<unknown, Listener>();
    byHandler.set(handler, listener);
    this.listeners.set(event, byHandler);
    this.emitter.on(event, listener);
  }

  off<T extends DomainEventName>(event: T, handler: DomainEventHandler<T>): void {
    const listener = this.listeners.get(event)?.get(handler);
    if (!listener) return;

    this.emitter.off(event, listener);
    this.listeners.get(event)?.delete(handler);
  }

  listenerCount(event: DomainEventName): number {
    return this.emitter.listenerCount(event);
  }
}

export const domainEventBus = new DomainEventBus();
