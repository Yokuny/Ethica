import {
  ALL_TRANSACTION_CATEGORIES,
  TRANSACTION_KINDS,
  TRANSACTION_STATUS,
  type TransactionCategory,
  type TransactionKind,
  type TransactionStatus,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Parcela recebida de um honorário (AD-111): só receita tem parcelas.
export interface InstallmentDocument {
  _id: mongoose.Types.ObjectId;
  amountCents: number;
  data: string;
  account?: string;
}

export interface TransactionDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  kind: TransactionKind;
  category: TransactionCategory;
  descricao: string;
  amountCents: number;
  // Datas de calendário `YYYY-MM-DD` no fuso de exibição (AD-036, AD-103).
  dueDate: string;
  status: TransactionStatus;
  settledDate?: string;
  installments: InstallmentDocument[];
  Case?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<TransactionDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    kind: { type: String, enum: TRANSACTION_KINDS, required: true },
    category: { type: String, enum: ALL_TRANSACTION_CATEGORIES, required: true },
    descricao: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: TRANSACTION_STATUS, default: 'expected', required: true },
    settledDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    installments: {
      type: [
        new Schema<InstallmentDocument>({
          amountCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
          data: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
          account: { type: String, trim: true },
        }),
      ],
      default: [],
    },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
  },
  { timestamps: true },
);

transactionSchema.pre('validate', function () {
  // Receita liquida pelas parcelas; só despesa guarda a data de liquidação.
  if (this.kind === 'expense' && this.status === 'settled' && !this.settledDate) {
    this.invalidate('settledDate', 'lançamento liquidado precisa da data de liquidação');
  }
});

transactionSchema.index({ Tenant: 1, dueDate: 1 });
transactionSchema.index({ Tenant: 1, Case: 1 });
transactionSchema.index({ Tenant: 1, kind: 1, status: 1 });

export const Transaction = mongoose.model<TransactionDocument>('Transaction', transactionSchema);
