import mongoose, { Schema } from 'mongoose';

// Each worker instance says it is alive (`/health`, and later the automation status, AD-267).
export interface WorkerHeartbeatDocument {
  _id: mongoose.Types.ObjectId;
  instance: string;
  beatAt: Date;
  version?: string;
}

const workerHeartbeatSchema = new Schema<WorkerHeartbeatDocument>({
  instance: { type: String, required: true, unique: true },
  beatAt: { type: Date, required: true },
  version: { type: String },
});

export const WorkerHeartbeat = mongoose.model<WorkerHeartbeatDocument>('WorkerHeartbeat', workerHeartbeatSchema);
