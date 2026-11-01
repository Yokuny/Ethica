import {
  LAUDO_NIVEL_MAX,
  LAUDO_STATUS,
  LAUDO_TIPOS,
  LAUDO_VARIANTES,
  type LaudoStatus,
  type LaudoTipo,
  type LaudoVariante,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Seção do laudo: cópia da seção do modelo na variante escolhida, com as variáveis já
// resolvidas na abertura (AD-126). Alterar o modelo depois não muda o laudo.
export interface LaudoSecaoDocument {
  _id: mongoose.Types.ObjectId;
  titulo: string;
  nivel: number;
  apenasTitulo: boolean;
  quebraPagina: boolean;
  variante: LaudoVariante;
  html: string;
}

export interface LaudoDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Case: mongoose.Types.ObjectId;
  tipo: LaudoTipo;
  status: LaudoStatus;
  titulo: string;
  modeloNome: string;
  secoes: LaudoSecaoDocument[];
  CriadoPor: mongoose.Types.ObjectId;
  ConcluidoPor?: mongoose.Types.ObjectId;
  concluidoEm?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const secaoSchema = new Schema<LaudoSecaoDocument>({
  titulo: { type: String, required: true, trim: true },
  nivel: { type: Number, required: true, min: 1, max: LAUDO_NIVEL_MAX },
  apenasTitulo: { type: Boolean, default: false },
  quebraPagina: { type: Boolean, default: false },
  variante: { type: String, enum: LAUDO_VARIANTES, required: true },
  html: { type: String, default: '' },
});

const laudoSchema = new Schema<LaudoDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    tipo: { type: String, enum: LAUDO_TIPOS, required: true },
    status: { type: String, enum: LAUDO_STATUS, default: 'draft', required: true },
    titulo: { type: String, required: true, trim: true },
    modeloNome: { type: String, required: true, trim: true },
    secoes: { type: [secaoSchema], default: [] },
    CriadoPor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ConcluidoPor: { type: Schema.Types.ObjectId, ref: 'User' },
    concluidoEm: { type: Date },
  },
  { timestamps: true },
);

laudoSchema.index({ Tenant: 1, Case: 1 });
laudoSchema.index({ Tenant: 1, status: 1, updatedAt: -1 });

export const Laudo = mongoose.model<LaudoDocument>('Laudo', laudoSchema);
