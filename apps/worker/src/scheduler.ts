import { dateInDisplayTz, timeInDisplayTz } from '@ethica/db';
import { enqueue } from './queue/queue.js';

// The scheduler only enqueues (worker plan, section 5): one job per kind and hour, by `dedupeKey`, so a
// restart or two replicas never run the same hour twice. Hours in America/Sao_Paulo (AD-036).
export const DIGEST_FROM_HOUR = 7;

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
  return enqueued;
};
