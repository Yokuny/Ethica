import mongoose, { Schema } from 'mongoose';

// Background job of the worker (AD-267): the queue between services lives in the database. Claim with
// `findOneAndUpdate` and a lease; a job of a dead worker comes back when the lease ends.
export const WORKER_JOB_STATUS = ['queued', 'running', 'done', 'failed'] as const;
export type WorkerJobStatus = (typeof WORKER_JOB_STATUS)[number];

export interface WorkerJobDocument {
  _id: mongoose.Types.ObjectId;
  kind: string;
  payload: Record<string, unknown>;
  // Lower first.
  priority: number;
  status: WorkerJobStatus;
  attempts: number;
  runAt: Date;
  lockedUntil?: Date;
  lockedBy?: string;
  error?: string;
  // The same window of the scheduler (`email_digest:2026-11-22T07`) never runs twice.
  dedupeKey?: string;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workerJobSchema = new Schema<WorkerJobDocument>(
  {
    kind: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    priority: { type: Number, default: 10 },
    status: { type: String, enum: WORKER_JOB_STATUS, default: 'queued', required: true },
    attempts: { type: Number, default: 0 },
    runAt: { type: Date, required: true, default: () => new Date() },
    lockedUntil: { type: Date },
    lockedBy: { type: String },
    error: { type: String },
    dedupeKey: { type: String },
    finishedAt: { type: Date },
  },
  { timestamps: true, minimize: false },
);

workerJobSchema.index({ status: 1, priority: 1, runAt: 1 });
workerJobSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });
// Finished jobs leave after 30 days.
workerJobSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 30 * 86_400 });

export const WorkerJob = mongoose.model<WorkerJobDocument>('WorkerJob', workerJobSchema);
