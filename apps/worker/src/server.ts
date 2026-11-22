import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { connect, disconnect, syncWorkerIndexes, WorkerHeartbeat } from '@ethica/db';
import { createMailProvider } from '@ethica/mail';
import { parseEnv } from './config/env.config.js';
import { createDatajudClient } from './datajud/client.js';
import { startHealthServer } from './health.js';
import { buildHandlers } from './jobs/index.js';
import { createPushSender } from './push.js';
import { runOne } from './queue/queue.js';
import { scheduleTick } from './scheduler.js';

// Background service (AD-267): env → database → its own indexes → /health and /metrics → heartbeat →
// scheduler → queue. It talks to the api only through the database and never applies a suggestion.
const LEASE_MS = 5 * 60_000;
const HEARTBEAT_MS = 30_000;

const log = (event: string, extra: object = {}) => console.log(JSON.stringify({ event, ...extra }));
const logError = (event: string, e: unknown) =>
  console.error(JSON.stringify({ event, message: e instanceof Error ? e.message : String(e) }));

export const start = async (): Promise<void> => {
  const env = parseEnv(process.env);
  await connect(env.MONGODB_URI);
  await syncWorkerIndexes();
  const datajud = env.DATAJUD_API_KEY
    ? createDatajudClient({
        apiKey: env.DATAJUD_API_KEY,
        baseUrl: env.DATAJUD_BASE_URL,
        minIntervalMs: env.DATAJUD_MIN_INTERVAL_MS,
      })
    : undefined;
  const push =
    env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
      ? createPushSender({
          publicKey: env.VAPID_PUBLIC_KEY,
          privateKey: env.VAPID_PRIVATE_KEY,
          subject: env.VAPID_SUBJECT ?? env.APP_URL,
        })
      : undefined;
  const handlers = buildHandlers({ mail: createMailProvider(env), appUrl: env.APP_URL, datajud, push });
  const beat = () =>
    WorkerHeartbeat.updateOne(
      { instance: env.WORKER_INSTANCE },
      { $set: { beatAt: new Date() } },
      { upsert: true },
    ).catch((e: unknown) => logError('worker.heartbeat_failed', e));
  await beat();
  const server: Server = startHealthServer(Number(env.WORKER_PORT), env.WORKER_INSTANCE);

  let stopping = false;
  const timers = [
    setInterval(beat, HEARTBEAT_MS),
    setInterval(() => void scheduleTick().catch((e) => logError('worker.schedule_failed', e)), env.WORKER_SCHEDULER_MS),
  ];
  void scheduleTick().catch((e) => logError('worker.schedule_failed', e));

  // N loops in parallel; each one sleeps while the queue is empty.
  const loop = async () => {
    while (!stopping) {
      const worked = await runOne(handlers, env.WORKER_INSTANCE, LEASE_MS).catch((e) => {
        logError('worker.loop_failed', e);
        return false;
      });
      if (!worked) await new Promise((resolve) => setTimeout(resolve, env.WORKER_POLL_MS));
    }
  };
  const loops = Array.from({ length: env.WORKER_CONCURRENCY }, loop);
  log('worker.started', { instance: env.WORKER_INSTANCE, concurrency: env.WORKER_CONCURRENCY });

  // SIGTERM: stops claiming, waits for the jobs in progress (a job cut in the middle comes back by the lease).
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    for (const timer of timers) clearInterval(timer);
    await Promise.race([Promise.all(loops), new Promise((resolve) => setTimeout(resolve, 25_000))]);
    server.close();
    await disconnect();
    log('worker.stopped');
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());
};

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  start().catch((e) => {
    logError('worker.boot_failed', e);
    process.exit(1);
  });
}
