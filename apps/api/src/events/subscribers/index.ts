import { registerDocumentsSubscriber } from './documents.subscriber.js';
import { registerFinanceSubscriber } from './finance.subscriber.js';

// buildApp() roda várias vezes no mesmo processo (testes), então o registro é
// idempotente — cada handler executa uma única vez por emit.
let registered = false;

export const registerAllSubscribers = (): void => {
  if (registered) return;
  registered = true;
  registerFinanceSubscriber();
  registerDocumentsSubscriber();
};
