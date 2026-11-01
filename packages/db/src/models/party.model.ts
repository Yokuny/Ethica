import { PARTY_TYPES, type PartyType } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Parte (autor/réu) ou advogado, reutilizável entre perícias do tenant (AD-117).
export interface PartyDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  tipo: PartyType;
  nome: string;
  // CPF/CNPJ só com dígitos (parte); OAB normalizada, ex.: SP123456 (advogado).
  document?: string;
  oab?: string;
  email?: string;
  telefone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const partySchema = new Schema<PartyDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    tipo: { type: String, enum: PARTY_TYPES, required: true },
    nome: { type: String, required: true, trim: true },
    document: { type: String, match: /^(\d{11}|\d{14})$/ },
    oab: { type: String, trim: true },
    email: { type: String, trim: true },
    telefone: { type: String, trim: true },
  },
  { timestamps: true },
);

// Reaproveitamento na importação e no cadastro da perícia (AD-115).
partySchema.index({ Tenant: 1, tipo: 1, document: 1 });
partySchema.index({ Tenant: 1, tipo: 1, oab: 1 });
partySchema.index({ Tenant: 1, tipo: 1, nome: 1 });

export const Party = mongoose.model<PartyDocument>('Party', partySchema);
