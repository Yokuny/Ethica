import { dateInDisplayTz, timeInDisplayTz } from '@ethica/db';
import { enqueue } from './queue/queue.js';

// The scheduler only enqueues (worker plan, section 5): one job per kind and hour, by `dedupeKey`, so a
// restart or two replicas never run the same hour twice. Hours in America/Sao_Paulo (AD-036).
export const DIGEST_FROM_HOUR = 7;
// The Datajud refresh once a day, early (its delay is T+1 to T+7, more often gains nothing). From 05:00: before it
// the search queue of the CNJ cluster stayed full and only the attempt near 05:00 passed (logs of 24 and 25/11,
// AD-303).
export const COURT_REFRESH_FROM_HOUR = 5;

export const scheduleTick = async (now: Date = new Date()): Promise<string[]> => {
  const day = dateInDisplayTz(now);
  const hour = Number(timeInDisplayTz(now).slice(0, 2));
  const window = `${day}T${String(hour).padStart(2, '0')}`;
  const enqueued: string[] = [];
  // The sweep comes first (lower priority number); the digest from 07:00 on, every hour, sends only to
  // whoever has not received the day's one yet (AD-147).
  if (await enqueue('reminders_sweep', {}, { dedupeKey: `reminders_sweep:${window}`, priority: 10 })) {
    enqueued.push('reminders_sweep');
  }
  if (
    hour >= DIGEST_FROM_HOUR &&
    (await enqueue('email_digest', {}, { dedupeKey: `email_digest:${window}`, priority: 20 }))
  ) {
    enqueued.push('email_digest');
  }
  if (
    hour >= COURT_REFRESH_FROM_HOUR &&
    (await enqueue('court_refresh', {}, { dedupeKey: `court_refresh:${day}`, priority: 30 }))
  ) {
    enqueued.push('court_refresh');
  }
  if (await enqueue('suggestions_expire', {}, { dedupeKey: `suggestions_expire:${day}`, priority: 30 })) {
    enqueued.push('suggestions_expire');
  }
  return enqueued;
};
