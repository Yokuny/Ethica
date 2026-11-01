import {
  CASE_PHASES,
  CASE_ROLES,
  CASE_STATUS,
  type CasePhase,
  type CaseRole,
  type CaseStatus,
  COURTTYPES,
  type CourtType,
  MOVEMENT_TYPES,
  type MovementType,
  PARTY_TYPES,
  type PartyType,
  SIDES,
  type Side,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Party linked to the case. `type` and `name` are a copy of the registry (AD-117): the listing
// search and the feed/reminder summary read from here; renaming the party updates the copy.
export interface CasePartyDocument {
  Party: mongoose.Types.ObjectId;
  side: Side;
  type: PartyType;
  name: string;
  // Whoever hired the technical assistant (AD-135).
  client?: boolean;
}

// Process movement that counts for the stalled case (AD-121). Date `YYYY-MM-DD`.
export interface CaseMovementDocument {
  _id: mongoose.Types.ObjectId;
  type: MovementType;
  date: string;
  notes?: string;
}

export interface CaseDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  processNumber: string;
  courtType: CourtType;
  role: CaseRole;
  court: string;
  division?: string;
  district?: string;
  subject: string;
  parties: CasePartyDocument[];
  status: CaseStatus;
  // Detailed phase (AD-133), always consistent with the status (rule in the service).
  phase?: CasePhase;
  // Calendar dates `YYYY-MM-DD` in the display time zone (AD-036, AD-103), not instants.
  nominationDate?: string;
  proposedFeesCents?: number;
  fixedFeesCents?: number;
  notes?: string;
  // Labor report auxiliary data (IMP-04); dates `YYYY-MM-DD` (AD-103).
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
  claimantJob?: string;
  nonPrescribedPeriodStart?: string;
  nonPrescribedPeriodEnd?: string;
  location?: string;
  movements: CaseMovementDocument[];
  // Case born from a prospecting opportunity (Datajud).
  Opportunity?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<CaseDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    processNumber: { type: String, required: true, trim: true },
    courtType: { type: String, enum: COURTTYPES, required: true },
    role: { type: String, enum: CASE_ROLES, required: true },
    court: { type: String, required: true, trim: true },
    division: { type: String, trim: true },
    district: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    parties: {
      type: [
        new Schema<CasePartyDocument>(
          {
            Party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
            side: { type: String, enum: SIDES, required: true },
            type: { type: String, enum: PARTY_TYPES, required: true },
            name: { type: String, required: true, trim: true },
            client: { type: Boolean },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    status: { type: String, enum: CASE_STATUS, default: 'appointed', required: true },
    phase: { type: String, enum: CASE_PHASES },
    nominationDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    proposedFeesCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    fixedFeesCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    notes: { type: String },
    docketingDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    hireDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    terminationDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    claimantJob: { type: String, trim: true },
    nonPrescribedPeriodStart: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    nonPrescribedPeriodEnd: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    location: { type: String, trim: true },
    movements: {
      type: [
        new Schema<CaseMovementDocument>({
          type: { type: String, enum: MOVEMENT_TYPES, required: true },
          date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
          notes: { type: String, trim: true },
        }),
      ],
      default: [],
    },
    Opportunity: { type: Schema.Types.ObjectId, ref: 'Opportunity' },
  },
  { timestamps: true },
);

// A process shows up once per tenant: the expert cannot register the same
// nomination twice (the index guarantees it, not the code).
caseSchema.index({ Tenant: 1, processNumber: 1 }, { unique: true });
caseSchema.index({ Tenant: 1, status: 1 });
caseSchema.index({ Tenant: 1, createdAt: -1 });
// Cases of a party (IMP-03) and name copy on rename.
caseSchema.index({ Tenant: 1, 'parties.Party': 1 });

export const Case = mongoose.model<CaseDocument>('Case', caseSchema);
