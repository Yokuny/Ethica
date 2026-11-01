import { type InspectionData, MEDIA_TYPES, type MediaType } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Mídia da vistoria no storage do tenant (AD-129). `id` vem do aparelho (UUID, AD-128).
export interface InspectionMediaDocument {
  id: string;
  tipo: MediaType;
  key: string;
  bytes: number;
  mime: string;
  caption?: string;
  createdAt: Date;
}

// Registro da vistoria (AD-130): um por compromisso. `dados` é o formulário inteiro, no
// formato de `vistoriaDadosSchema` (validado na API); `versao` resolve o conflito do offline.
export interface InspectionDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Appointment: mongoose.Types.ObjectId;
  Case?: mongoose.Types.ObjectId;
  versao: number;
  dados: InspectionData;
  media: InspectionMediaDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<InspectionMediaDocument>(
  {
    id: { type: String, required: true },
    tipo: { type: String, enum: MEDIA_TYPES, required: true },
    key: { type: String, required: true },
    bytes: { type: Number, required: true, min: 0 },
    mime: { type: String, required: true },
    caption: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const inspectionSchema = new Schema<InspectionDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    Appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
    versao: { type: Number, required: true, default: 0 },
    dados: { type: Schema.Types.Mixed, required: true },
    media: { type: [mediaSchema], default: [] },
  },
  { timestamps: true, minimize: false },
);

inspectionSchema.index({ Tenant: 1, Appointment: 1 }, { unique: true });
inspectionSchema.index({ Tenant: 1, Case: 1 });

export const Inspection = mongoose.model<InspectionDocument>('Inspection', inspectionSchema);
