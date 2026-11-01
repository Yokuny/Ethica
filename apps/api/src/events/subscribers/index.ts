import { registerDocumentsSubscriber } from './documents.subscriber.js';
import { registerFinanceSubscriber } from './finance.subscriber.js';

// buildApp() runs several times in the same process (tests), so registration is
// idempotent — each handler runs only once per emit.
let registered = false;

export const registerAllSubscribers = (): void => {
  if (registered) return;
  registered = true;
  registerFinanceSubscriber();
  registerDocumentsSubscriber();
};
