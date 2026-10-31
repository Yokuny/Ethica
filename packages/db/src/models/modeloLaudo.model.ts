import { LAUDO_NIVEL_MAX, LAUDO_TIPOS, type LaudoTipo } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Seção do modelo (LAU-01): a ordem é a do array e o número ("2.1") é calculado pelo nível,
// nunca gravado (AD-126). Os textos são HTML saneado na API (AD-123).
export interface ModeloLaudoSecaoDocument {
  _id: mongoose.Types.ObjectId;
  titulo: string;
  nivel: number;
  apenasTitulo: boolean;
  quebraPagina: boolean;
  textoSim: string;
  textoNao: string;
}

export interface ModeloLaudoDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  nome: string;
  tipo: LaudoTipo;
  secoes: ModeloLaudoSecaoDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const secaoSchema = new Schema<ModeloLaudoSecaoDocument>({
  titulo: { type: String, required: true, trim: true },
  nivel: { type: Number, required: true, min: 1, max: LAUDO_NIVEL_MAX },
  apenasTitulo: { type: Boolean, default: false },
  quebraPagina: { type: Boolean, default: false },
  textoSim: { type: String, default: '' },
  textoNao: { type: String, default: '' },
});

const modeloLaudoSchema = new Schema<ModeloLaudoDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    nome: { type: String, required: true, trim: true },
    tipo: { type: String, enum: LAUDO_TIPOS, required: true },
    secoes: { type: [secaoSchema], default: [] },
  },
  { timestamps: true, collection: 'modelos_laudo' },
);

modeloLaudoSchema.index({ Tenant: 1, tipo: 1, nome: 1 });

export const ModeloLaudo = mongoose.model<ModeloLaudoDocument>('ModeloLaudo', modeloLaudoSchema);
