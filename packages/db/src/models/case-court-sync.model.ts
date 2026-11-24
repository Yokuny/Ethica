import mongoose, { Schema } from 'mongoose';

// Tracking of a case in court (AD-268): the movement keys this case has already seen. The first sync
// (and the module back on) only saves them — the baseline — and creates nothing; afterwards only a key not
// seen becomes a notice. Per case, because the CourtProcess is global. Every successful query records
// `syncedAt`; `baselineAt` only exists once the Datajud brought the process (without it: not found in court).
export interface CaseCourtSyncDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Case: mongoose.Types.ObjectId;
  court: string;
  processNumber: string;
  seenMovementKeys: string[];
  baselineAt?: Date;
  syncedAt: Date;
}

const caseCourtSyncSchema = new Schema<CaseCourtSyncDocument>({
  Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  Case: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
  court: { type: String, required: true },
  processNumber: { type: String, required: true },
  seenMovementKeys: { type: [String], default: [] },
  baselineAt: { type: Date },
  syncedAt: { type: Date, required: true },
});

caseCourtSyncSchema.index({ Tenant: 1, Case: 1 }, { unique: true });

export const CaseCourtSync = mongoose.model<CaseCourtSyncDocument>('CaseCourtSync', caseCourtSyncSchema);
