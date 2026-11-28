import mongoose, { Schema } from 'mongoose';

// Process in court, a copy of the Datajud (AD-271): public data of the CNJ, the same for every office, so
// it is NOT tenant scoped and holds no office data. Never a secret process (`nivelSigilo > 0`), never the
// parties. One document per court, number and degree (the Datajud keeps one per degree).
export interface CourtProcessDocument {
  _id: mongoose.Types.ObjectId;
  court: string;
  // CNJ mask, as the cases keep it.
  processNumber: string;
  degree: string;
  className?: string;
  courtUnitName?: string;
  // Filing day (calendar date) and the subjects of the process: fill the case by the number (SGD-06, SGD-07).
  filedAt?: string;
  subjects: string[];
  sourceUpdatedAt?: Date;
  movements: {
    key: string;
    code: number;
    name: string;
    at: Date;
    complements: { code?: number; description?: string; value?: number; name?: string }[];
  }[];
  fetchedAt: Date;
}

const courtProcessSchema = new Schema<CourtProcessDocument>({
  court: { type: String, required: true },
  processNumber: { type: String, required: true },
  degree: { type: String, required: true },
  className: { type: String },
  courtUnitName: { type: String },
  filedAt: { type: String },
  subjects: { type: [String], default: [] },
  sourceUpdatedAt: { type: Date },
  movements: {
    type: [
      new Schema(
        {
          key: { type: String, required: true },
          code: { type: Number, required: true },
          name: { type: String, required: true },
          at: { type: Date, required: true },
          complements: { type: [Schema.Types.Mixed], default: [] },
        },
        { _id: false },
      ),
    ],
    default: [],
  },
  fetchedAt: { type: Date, required: true },
});

courtProcessSchema.index({ court: 1, processNumber: 1, degree: 1 }, { unique: true });

export const CourtProcess = mongoose.model<CourtProcessDocument>('CourtProcess', courtProcessSchema);
