import type { MailProvider } from '@ethica/mail';
import type { JobHandler } from '../queue/queue.js';
import { sendDigest } from './email-digest.js';
import { sendImmediate } from './email-immediate.js';
import { sweepReminders } from './reminders-sweep.js';

// Job kinds of the worker (central-notificacoes design, section 7).
export const buildHandlers = (deps: { mail: MailProvider; appUrl: string }): Record<string, JobHandler> => ({
  reminders_sweep: async (_payload, now) => {
    console.log(JSON.stringify({ event: 'worker.reminders_sweep', ...(await sweepReminders(now)) }));
  },
  email_digest: async (_payload, now) => {
    console.log(JSON.stringify({ event: 'worker.email_digest', ...(await sendDigest(deps, now)) }));
  },
  email_immediate: async (payload, now) => {
    const result = await sendImmediate(deps, String(payload.notificationId), now);
    console.log(JSON.stringify({ event: 'worker.email_immediate', ...result }));
  },
});
