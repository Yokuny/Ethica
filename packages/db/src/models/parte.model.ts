import { PARTE_TIPOS, type ParteTipo } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Parte (autor/réu) ou advogado, reutilizável entre perícias do tenant (AD-117).
export interface ParteDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  tipo: ParteTipo;
  nome: string;
  // CPF/CNPJ só com dígitos (parte); OAB normalizada, ex.: SP123456 (advogado).
  documento?: string;
  oab?: string;
  email?: string;
  telefone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const parteSchema = new Schema<ParteDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    tipo: { type: String, enum: PARTE_TIPOS, required: true },
    nome: { type: String, required: true, trim: true },
    documento: { type: String, match: /^(\d{11}|\d{14})$/ },
    oab: { type: String, trim: true },
    email: { type: String, trim: true },
    telefone: { type: String, trim: true },
  },
  { timestamps: true },
);

// Reaproveitamento na importação e no cadastro da perícia (AD-115).
parteSchema.index({ Tenant: 1, tipo: 1, documento: 1 });
parteSchema.index({ Tenant: 1, tipo: 1, oab: 1 });
parteSchema.index({ Tenant: 1, tipo: 1, nome: 1 });

export const Parte = mongoose.model<ParteDocument>('Parte', parteSchema);
