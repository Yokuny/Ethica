import { ALL_DATAJUD_COURTS, type DatajudCourt, OPPORTUNITY_STATUS, type OpportunityStatus } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export interface OpportunityDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  processNumber: string;
  court: DatajudCourt;
  caseClass?: string;
  subjects: string[];
  courtUnit?: string;
  // Values as they came from Datajud (ISO text), for display only.
  filingDate?: string;
  lastMovement?: string;
  lastMovementAt?: string;
  status: OpportunityStatus;
  notes?: string;
  Case?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const opportunitySchema = new Schema<OpportunityDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    processNumber: { type: String, required: true, trim: true },
    court: { type: String, enum: ALL_DATAJUD_COURTS, required: true },
    caseClass: { type: String },
    subjects: { type: [String], default: [] },
    courtUnit: { type: String },
    filingDate: { type: String },
    lastMovement: { type: String },
    lastMovementAt: { type: String },
    status: { type: String, enum: OPPORTUNITY_STATUS, default: 'new', required: true },
    notes: { type: String },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
  },
  { timestamps: true },
);

opportunitySchema.index({ Tenant: 1, processNumber: 1 }, { unique: true });
opportunitySchema.index({ Tenant: 1, status: 1, createdAt: -1 });

export const Opportunity = mongoose.model<OpportunityDocument>('Opportunity', opportunitySchema);
