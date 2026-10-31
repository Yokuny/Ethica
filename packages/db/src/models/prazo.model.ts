import { PRAZO_STATUS, type PrazoStatus } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export interface PrazoDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Pericia: mongoose.Types.ObjectId;
  titulo: string;
  // Datas de calendário `YYYY-MM-DD` no fuso de exibição (AD-103): prazo é um dia, não um instante.
  vencimento: string;
  status: PrazoStatus;
  protocoladoEm?: string;
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const prazoSchema = new Schema<PrazoDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    Pericia: { type: Schema.Types.ObjectId, ref: 'Pericia', required: true },
    titulo: { type: String, required: true, trim: true },
    vencimento: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: PRAZO_STATUS, default: 'pending', required: true },
    protocoladoEm: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    observacoes: { type: String },
  },
  { timestamps: true },
);

prazoSchema.pre('validate', function () {
  if (this.status === 'filed' && !this.protocoladoEm) {
    this.invalidate('protocoladoEm', 'prazo protocolado precisa da data de protocolo');
  }
});

prazoSchema.index({ Tenant: 1, Pericia: 1, vencimento: 1 });
prazoSchema.index({ Tenant: 1, status: 1, vencimento: 1 });
// Aviso diário por e-mail: varre os pendentes de alguns dias em todos os tenants.
prazoSchema.index({ status: 1, vencimento: 1 });

export const Prazo = mongoose.model<PrazoDocument>('Prazo', prazoSchema);
