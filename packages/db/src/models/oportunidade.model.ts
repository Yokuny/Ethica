import {
  ALL_DATAJUD_TRIBUNAIS,
  type DatajudTribunal,
  OPORTUNIDADE_STATUS,
  type OportunidadeStatus,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export interface OportunidadeDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  numeroProcesso: string;
  tribunal: DatajudTribunal;
  classe?: string;
  assuntos: string[];
  orgaoJulgador?: string;
  // Valores como vieram do Datajud (texto ISO), só para exibição.
  dataAjuizamento?: string;
  ultimoMovimento?: string;
  ultimoMovimentoEm?: string;
  status: OportunidadeStatus;
  observacoes?: string;
  Pericia?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const oportunidadeSchema = new Schema<OportunidadeDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    numeroProcesso: { type: String, required: true, trim: true },
    tribunal: { type: String, enum: ALL_DATAJUD_TRIBUNAIS, required: true },
    classe: { type: String },
    assuntos: { type: [String], default: [] },
    orgaoJulgador: { type: String },
    dataAjuizamento: { type: String },
    ultimoMovimento: { type: String },
    ultimoMovimentoEm: { type: String },
    status: { type: String, enum: OPORTUNIDADE_STATUS, default: 'nova', required: true },
    observacoes: { type: String },
    Pericia: { type: Schema.Types.ObjectId, ref: 'Pericia' },
  },
  { timestamps: true },
);

oportunidadeSchema.index({ Tenant: 1, numeroProcesso: 1 }, { unique: true });
oportunidadeSchema.index({ Tenant: 1, status: 1, createdAt: -1 });

export const Oportunidade = mongoose.model<OportunidadeDocument>('Oportunidade', oportunidadeSchema);
