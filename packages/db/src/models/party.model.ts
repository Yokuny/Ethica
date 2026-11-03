import { PARTY_TYPES, type PartyType, partyNameKey } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Party (plaintiff/defendant) or lawyer, reusable across the tenant's cases (AD-117).
export interface PartyDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  type: PartyType;
  name: string;
  // Name without case, accent or repeated space (PSV-05): finds the same person written differently.
  nameKey: string;
  // CPF/CNPJ digits only (party); normalized OAB, e.g. SP123456 (lawyer).
  document?: string;
  oab?: string;
  // Normalized CREA, e.g. SC1848220 (PSV-05).
  crea?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const partySchema = new Schema<PartyDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    type: { type: String, enum: PARTY_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    nameKey: { type: String },
    document: { type: String, match: /^(\d{11}|\d{14})$/ },
    oab: { type: String, trim: true },
    crea: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true },
);

partySchema.pre('validate', function () {
  this.nameKey = partyNameKey(this.name);
});
partySchema.pre('findOneAndUpdate', function () {
  const name = (this.getUpdate() as { name?: string } | null)?.name;
  if (name) this.set('nameKey', partyNameKey(name));
});

// Reuse in the import and in the case registration (AD-115).
partySchema.index({ Tenant: 1, type: 1, document: 1 });
partySchema.index({ Tenant: 1, type: 1, oab: 1 });
partySchema.index({ Tenant: 1, type: 1, name: 1 });
partySchema.index({ Tenant: 1, type: 1, nameKey: 1 });

export const Party = mongoose.model<PartyDocument>('Party', partySchema);
