import {
  ALL_LANCAMENTO_CATEGORIAS,
  LANCAMENTO_NATUREZAS,
  LANCAMENTO_STATUS,
  type LancamentoCategoria,
  type LancamentoNatureza,
  type LancamentoStatus,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Parcela recebida de um honorário (AD-111): só receita tem parcelas.
export interface ParcelaDocument {
  _id: mongoose.Types.ObjectId;
  valorCents: number;
  data: string;
  conta?: string;
}

export interface LancamentoDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  natureza: LancamentoNatureza;
  categoria: LancamentoCategoria;
  descricao: string;
  valorCents: number;
  // Datas de calendário `YYYY-MM-DD` no fuso de exibição (AD-036, AD-103).
  vencimento: string;
  status: LancamentoStatus;
  liquidadoEm?: string;
  parcelas: ParcelaDocument[];
  Pericia?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lancamentoSchema = new Schema<LancamentoDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    natureza: { type: String, enum: LANCAMENTO_NATUREZAS, required: true },
    categoria: { type: String, enum: ALL_LANCAMENTO_CATEGORIAS, required: true },
    descricao: { type: String, required: true, trim: true },
    valorCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    vencimento: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: LANCAMENTO_STATUS, default: 'expected', required: true },
    liquidadoEm: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    parcelas: {
      type: [
        new Schema<ParcelaDocument>({
          valorCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
          data: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
          conta: { type: String, trim: true },
        }),
      ],
      default: [],
    },
    Pericia: { type: Schema.Types.ObjectId, ref: 'Pericia' },
  },
  { timestamps: true },
);

lancamentoSchema.pre('validate', function () {
  // Receita liquida pelas parcelas; só despesa guarda a data de liquidação.
  if (this.natureza === 'expense' && this.status === 'settled' && !this.liquidadoEm) {
    this.invalidate('liquidadoEm', 'lançamento liquidado precisa da data de liquidação');
  }
});

lancamentoSchema.index({ Tenant: 1, vencimento: 1 });
lancamentoSchema.index({ Tenant: 1, Pericia: 1 });
lancamentoSchema.index({ Tenant: 1, natureza: 1, status: 1 });

export const Lancamento = mongoose.model<LancamentoDocument>('Lancamento', lancamentoSchema);
