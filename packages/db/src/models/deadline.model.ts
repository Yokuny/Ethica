import { DEADLINE_STATUS, type DeadlineStatus } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export interface DeadlineDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Case: mongoose.Types.ObjectId;
  titulo: string;
  // Datas de calendário `YYYY-MM-DD` no fuso de exibição (AD-103): prazo é um dia, não um instante.
  vencimento: string;
  status: DeadlineStatus;
  filedDate?: string;
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const deadlineSchema = new Schema<DeadlineDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    titulo: { type: String, required: true, trim: true },
    vencimento: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: DEADLINE_STATUS, default: 'pending', required: true },
    filedDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    observacoes: { type: String },
  },
  { timestamps: true },
);

deadlineSchema.pre('validate', function () {
  if (this.status === 'filed' && !this.filedDate) {
    this.invalidate('filedDate', 'prazo protocolado precisa da data de protocolo');
  }
});

deadlineSchema.index({ Tenant: 1, Case: 1, vencimento: 1 });
deadlineSchema.index({ Tenant: 1, status: 1, vencimento: 1 });
// Aviso diário por e-mail: varre os pendentes de alguns dias em todos os tenants.
deadlineSchema.index({ status: 1, vencimento: 1 });

export const Deadline = mongoose.model<DeadlineDocument>('Deadline', deadlineSchema);
