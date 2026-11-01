import { EventEmitter } from 'node:events';
import type { DomainEventMap, DomainEventName } from './event-types.js';

type DomainEventHandler<T extends DomainEventName> = (payload: DomainEventMap[T]) => Promise<void>;
type Listener = (payload: unknown) => void;

// Fire-and-forget: a handler failure never reaches the emitter —
// it is logged in the same JSON format as errorHandler.middleware.ts.
class DomainEventBus {
  private emitter = new EventEmitter();
  // The EventEmitter registers the wrapper, not the handler: keeping the wrapper by
  // (event, handler) is what allows `off` with the same handler passed to `on`.
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
