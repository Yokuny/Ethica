import {
  JUSTICAS,
  type Justica,
  PAPEIS_PERICIA,
  type PapelPericia,
  PERICIA_STATUS,
  type PericiaStatus,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export interface PericiaDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  numeroProcesso: string;
  justica: Justica;
  papel: PapelPericia;
  tribunal: string;
  vara?: string;
  comarca?: string;
  objeto: string;
  autor?: string;
  reu?: string;
  status: PericiaStatus;
  // Datas de calendário `YYYY-MM-DD` no fuso de exibição (AD-036, AD-103), não instantes.
  dataNomeacao?: string;
  prazoLaudo?: string;
  honorariosPropostosCents?: number;
  honorariosFixadosCents?: number;
  observacoes?: string;
  // Perícia que nasceu de uma oportunidade de prospecção (Datajud).
  Oportunidade?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const periciaSchema = new Schema<PericiaDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    numeroProcesso: { type: String, required: true, trim: true },
    justica: { type: String, enum: JUSTICAS, required: true },
    papel: { type: String, enum: PAPEIS_PERICIA, required: true },
    tribunal: { type: String, required: true, trim: true },
    vara: { type: String, trim: true },
    comarca: { type: String, trim: true },
    objeto: { type: String, required: true, trim: true },
    autor: { type: String, trim: true },
    reu: { type: String, trim: true },
    status: { type: String, enum: PERICIA_STATUS, default: 'nomeada', required: true },
    dataNomeacao: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    prazoLaudo: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    honorariosPropostosCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    honorariosFixadosCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    observacoes: { type: String },
    Oportunidade: { type: Schema.Types.ObjectId, ref: 'Oportunidade' },
  },
  { timestamps: true },
);

// Um processo aparece uma vez por tenant: o perito não pode cadastrar a mesma
// nomeação duas vezes (o índice é quem garante, não o código).
periciaSchema.index({ Tenant: 1, numeroProcesso: 1 }, { unique: true });
periciaSchema.index({ Tenant: 1, status: 1, prazoLaudo: 1 });
periciaSchema.index({ Tenant: 1, createdAt: -1 });

export const Pericia = mongoose.model<PericiaDocument>('Pericia', periciaSchema);
