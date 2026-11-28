import mongoose, { Schema } from 'mongoose';

// What the daily court query did for one office on one day (PAT-06): how many cases were in the run, which ones the
// court answered (a set, so a retried batch counts a case once), found or not, the new movements seen and the notices
// created per module. The Automação panel reads it month by month; "no answer" = `tracked − answeredCases`.
export interface CourtSyncDayDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  // Day of the run, `YYYY-MM-DD` in the display time zone (the batch `day`).
  day: string;
  tracked: number;
  answeredCases: mongoose.Types.ObjectId[];
  found: number;
  notFound: number;
  newMovements: number;
  notices: { expert_cases: number; finance: number };
}

const courtSyncDaySchema = new Schema<CourtSyncDayDocument>({
  Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  day: { type: String, required: true },
  tracked: { type: Number, default: 0 },
  answeredCases: { type: [Schema.Types.ObjectId], default: [] },
  found: { type: Number, default: 0 },
  notFound: { type: Number, default: 0 },
  newMovements: { type: Number, default: 0 },
  notices: {
    expert_cases: { type: Number, default: 0 },
    finance: { type: Number, default: 0 },
  },
});

courtSyncDaySchema.index({ Tenant: 1, day: 1 }, { unique: true });

export const CourtSyncDay = mongoose.model<CourtSyncDayDocument>('CourtSyncDay', courtSyncDaySchema);
