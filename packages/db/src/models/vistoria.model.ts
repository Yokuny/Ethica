import { MIDIA_TIPOS, type MidiaTipo, type VistoriaDados } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Mídia da vistoria no storage do tenant (AD-129). `id` vem do aparelho (UUID, AD-128).
export interface VistoriaMidiaDocument {
  id: string;
  tipo: MidiaTipo;
  key: string;
  bytes: number;
  mime: string;
  legenda?: string;
  createdAt: Date;
}

// Registro da vistoria (AD-130): um por compromisso. `dados` é o formulário inteiro, no
// formato de `vistoriaDadosSchema` (validado na API); `versao` resolve o conflito do offline.
export interface VistoriaDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Compromisso: mongoose.Types.ObjectId;
  Pericia?: mongoose.Types.ObjectId;
  versao: number;
  dados: VistoriaDados;
  midias: VistoriaMidiaDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const midiaSchema = new Schema<VistoriaMidiaDocument>(
  {
    id: { type: String, required: true },
    tipo: { type: String, enum: MIDIA_TIPOS, required: true },
    key: { type: String, required: true },
    bytes: { type: Number, required: true, min: 0 },
    mime: { type: String, required: true },
    legenda: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const vistoriaSchema = new Schema<VistoriaDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    Compromisso: { type: Schema.Types.ObjectId, ref: 'Compromisso', required: true },
    Pericia: { type: Schema.Types.ObjectId, ref: 'Pericia' },
    versao: { type: Number, required: true, default: 0 },
    dados: { type: Schema.Types.Mixed, required: true },
    midias: { type: [midiaSchema], default: [] },
  },
  { timestamps: true, minimize: false },
);

vistoriaSchema.index({ Tenant: 1, Compromisso: 1 }, { unique: true });
vistoriaSchema.index({ Tenant: 1, Pericia: 1 });

export const Vistoria = mongoose.model<VistoriaDocument>('Vistoria', vistoriaSchema);
