import type { TrackedCase } from '@ethica/db';
import type { MailProvider } from '@ethica/mail';
import { type DatajudClient, lookupEgressIp } from '../datajud/client.js';
import type { PushSender } from '../push.js';
import type { JobHandler } from '../queue/queue.js';
import { enqueueCourtRefresh, refreshCourtBatch } from './court-refresh.js';
import { sendDigest } from './email-digest.js';
import { sendImmediate } from './email-immediate.js';
import { sweepReminders } from './reminders-sweep.js';
import { expireSuggestions } from './suggestions-expire.js';

// Job kinds of the worker (central-notificacoes design, section 7).
export const buildHandlers = (deps: {
  mail: MailProvider;
  appUrl: string;
  datajud?: DatajudClient;
  push?: PushSender;
}): Record<string, JobHandler> => ({
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
  suggestions_expire: async (_payload, now) => {
    console.log(JSON.stringify({ event: 'worker.suggestions_expire', ...(await expireSuggestions(now)) }));
  },
  // Without the Datajud key the tracking in court stays off (the jobs end without doing anything).
  court_refresh: async (_payload, now) => {
    if (!deps.datajud) return;
    // The public IP of the day goes with the run (AD-287): it shows whether the 429 follows the address.
    const [result, ip] = await Promise.all([enqueueCourtRefresh(now), lookupEgressIp()]);
    console.log(JSON.stringify({ event: 'worker.court_refresh', ip, ...result }));
  },
  court_refresh_batch: async (payload, now) => {
    if (!deps.datajud) return;
    const batch = payload as { court: string; day: string; cases: TrackedCase[] };
    const result = await refreshCourtBatch(deps.datajud, batch, now);
    console.log(
      JSON.stringify({
        event: 'worker.court_refresh_batch',
        court: batch.court,
        day: batch.day,
        cases: batch.cases.length,
        ...result,
      }),
    );
  },
});
