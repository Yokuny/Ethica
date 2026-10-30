export { domainEventBus } from './event-bus.js';
export type {
  DomainEventMap,
  DomainEventName,
  PericiaCreatedPayload,
  PericiaHonorariosFixadosPayload,
} from './event-types.js';
export { registerAllSubscribers } from './subscribers/index.js';
