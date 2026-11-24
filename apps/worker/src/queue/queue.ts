import { WorkerJob, type WorkerJobDocument } from '@ethica/db';

// Queue in the database (AD-267, worker plan D4): claim with `findOneAndUpdate` and a lease, priority,
// retry with backoff and jitter, and a `dedupeKey` that keeps one window of the scheduler from running twice.

export type JobHandler = (payload: Record<string, unknown>, now: Date) => Promise<void>;

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Enqueues once per `dedupeKey`; a key already used returns false.
export const enqueue = async (
  kind: string,
  payload: Record<string, unknown> = {},
  options: { dedupeKey?: string; priority?: number; runAt?: Date; maxAttempts?: number } = {},
): Promise<boolean> => {
  try {
    await WorkerJob.create({
      kind,
      payload,
      priority: options.priority ?? 10,
      runAt: options.runAt,
      dedupeKey: options.dedupeKey,
      maxAttempts: options.maxAttempts,
    });
    return true;
  } catch (e) {
    if (isDuplicateKey(e)) return false;
    throw e;
  }
};

// A queued job whose time came, or a running one whose worker died (lease over).
export const claim = async (instance: string, leaseMs: number, now = new Date()): Promise<WorkerJobDocument | null> =>
  WorkerJob.findOneAndUpdate(
    {
      $or: [
        { status: 'queued', runAt: { $lte: now } },
        { status: 'running', lockedUntil: { $lt: now } },
      ],
    },
    {
      $set: { status: 'running', lockedBy: instance, lockedUntil: new Date(now.getTime() + leaseMs) },
      $inc: { attempts: 1 },
    },
    { sort: { priority: 1, runAt: 1 }, returnDocument: 'after' },
  ).lean();

export const complete = (id: WorkerJobDocument['_id'], now = new Date()) =>
  WorkerJob.updateOne({ _id: id }, { $set: { status: 'done', finishedAt: now }, $unset: { lockedUntil: 1 } });

export const MAX_ATTEMPTS = 5;

// Back to the queue with exponential backoff and jitter; after the last attempt, `failed`.
export const fail = (
  job: Pick<WorkerJobDocument, '_id' | 'attempts' | 'maxAttempts'>,
  error: unknown,
  now = new Date(),
) => {
  const message = error instanceof Error ? error.message : String(error);
  if (job.attempts >= (job.maxAttempts ?? MAX_ATTEMPTS)) {
    return WorkerJob.updateOne({ _id: job._id }, { $set: { status: 'failed', error: message, finishedAt: now } });
  }
  const delay = Math.min(30 * 60_000, 2 ** job.attempts * 30_000) * (0.5 + Math.random());
  return WorkerJob.updateOne(
    { _id: job._id },
    { $set: { status: 'queued', error: message, runAt: new Date(now.getTime() + delay) }, $unset: { lockedUntil: 1 } },
  );
};

// Runs one claimed job with its handler; an unknown kind fails for good.
export const runOne = async (
  handlers: Record<string, JobHandler>,
  instance: string,
  leaseMs: number,
  now = new Date(),
): Promise<boolean> => {
  const job = await claim(instance, leaseMs, now);
  if (!job) return false;
  const handler: JobHandler | undefined = handlers[job.kind];
  try {
    if (!handler) throw new Error(`job desconhecido: ${job.kind}`);
    await handler(job.payload ?? {}, now);
    await complete(job._id);
    console.log(JSON.stringify({ event: 'worker.job_done', kind: job.kind, attempts: job.attempts }));
  } catch (e) {
    await fail(handler === undefined ? { ...job, maxAttempts: job.attempts } : job, e);
    console.error(
      JSON.stringify({
        event: 'worker.job_failed',
        kind: job.kind,
        message: e instanceof Error ? e.message : String(e),
      }),
    );
  }
  return true;
};
