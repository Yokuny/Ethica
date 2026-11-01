import type { MailProvider } from './mailProvider.type.js';

// Dev/test implementation: never actually sends, always "sent: true" and
// records it in the structured log.
export const createLogMailProvider = (): MailProvider => ({
  send: async (to, subject, body) => {
    console.log(JSON.stringify({ event: 'mail.log_send', to, subject, body }));
    return { sent: true };
  },
});
