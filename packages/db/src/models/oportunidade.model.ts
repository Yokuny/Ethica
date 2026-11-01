import { ALL_DATAJUD_COURTS, type DatajudCourt, OPORTUNIDADE_STATUS, type OportunidadeStatus } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export interface OportunidadeDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  processNumber: string;
  court: DatajudCourt;
  classe?: string;
  assuntos: string[];
  orgaoJulgador?: string;
  // Valores como vieram do Datajud (texto ISO), só para exibição.
  filingDate?: string;
  lastMovement?: string;
  lastMovementAt?: string;
  status: OportunidadeStatus;
  observacoes?: string;
  Case?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const oportunidadeSchema = new Schema<OportunidadeDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    processNumber: { type: String, required: true, trim: true },
    court: { type: String, enum: ALL_DATAJUD_COURTS, required: true },
    classe: { type: String },
    assuntos: { type: [String], default: [] },
    orgaoJulgador: { type: String },
    filingDate: { type: String },
    lastMovement: { type: String },
    lastMovementAt: { type: String },
    status: { type: String, enum: OPORTUNIDADE_STATUS, default: 'new', required: true },
    observacoes: { type: String },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
  },
  { timestamps: true },
);

oportunidadeSchema.index({ Tenant: 1, processNumber: 1 }, { unique: true });
oportunidadeSchema.index({ Tenant: 1, status: 1, createdAt: -1 });

export const Oportunidade = mongoose.model<OportunidadeDocument>('Oportunidade', oportunidadeSchema);
