import { BRAZILIAN_STATES, type BrazilianState, COURTTYPES, type CourtType } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Court division (vara) in the office contact book (AD-151).
export interface CourtDivisionDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  courtType: CourtType;
  name: string;
  court?: string;
  state: BrazilianState;
  city: string;
  address?: string;
  phones?: string;
  email?: string;
  virtualDesk?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Portuguese, ignoring case and accents: "São Paulo" = "sao paulo".
export const COURT_DIVISION_COLLATION = { locale: 'pt', strength: 1 } as const;

const courtDivisionSchema = new Schema<CourtDivisionDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    courtType: { type: String, enum: COURTTYPES, required: true },
    name: { type: String, required: true, trim: true },
    court: { type: String, trim: true },
    state: { type: String, enum: BRAZILIAN_STATES, required: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phones: { type: String, trim: true },
    email: { type: String, trim: true },
    virtualDesk: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true, collection: 'court_divisions' },
);

// The same division in the same city is registered once (spreadsheet import skips it).
courtDivisionSchema.index(
  { Tenant: 1, state: 1, city: 1, name: 1 },
  { unique: true, collation: COURT_DIVISION_COLLATION },
);

export const CourtDivision = mongoose.model<CourtDivisionDocument>('CourtDivision', courtDivisionSchema);
