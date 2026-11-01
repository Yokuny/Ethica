import {
  COMPROMISSO_MOTIVOS,
  COMPROMISSO_STATUS,
  COMPROMISSO_TIPOS,
  type CompromissoMotivo,
  type CompromissoStatus,
  type CompromissoTipo,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export type CompromissoOrigem = 'manual' | 'automatic';

export interface CompromissoDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  tipo: CompromissoTipo;
  titulo: string;
  // Instantes em UTC (AD-036, AD-103); a tela converte para o fuso de exibição.
  inicio: Date;
  fim: Date;
  local?: string;
  Case?: mongoose.Types.ObjectId;
  status: CompromissoStatus;
  origem: CompromissoOrigem;
  observacoes?: string;
  // Cancelado no campo: adiado ou parte ausente (AD-130).
  motivo?: CompromissoMotivo;
  // Geocodificação do `local` (AD-131), válida enquanto `endereco` for igual ao `local`.
  coordenadas?: { lat: number; lng: number; endereco: string };
  // Avisos de agendamento enviados às partes (AD-131).
  avisos: Array<{ User: mongoose.Types.ObjectId; at: Date; destinatarios: string[] }>;
  createdAt: Date;
  updatedAt: Date;
}

const compromissoSchema = new Schema<CompromissoDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    tipo: { type: String, enum: COMPROMISSO_TIPOS, required: true },
    titulo: { type: String, required: true, trim: true },
    inicio: { type: Date, required: true },
    fim: { type: Date, required: true },
    local: { type: String, trim: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
    status: { type: String, enum: COMPROMISSO_STATUS, default: 'scheduled', required: true },
    origem: { type: String, enum: ['manual', 'automatic'], default: 'manual', required: true },
    observacoes: { type: String },
    motivo: { type: String, enum: COMPROMISSO_MOTIVOS },
    coordenadas: { type: new Schema({ lat: Number, lng: Number, endereco: String }, { _id: false }) },
    avisos: {
      type: [
        new Schema(
          { User: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, destinatarios: [String] },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

compromissoSchema.pre('validate', function () {
  if (this.fim && this.inicio && this.fim <= this.inicio) this.invalidate('fim', 'fim precisa ser depois do início');
});

// Consulta da agenda é sempre por intervalo [from, to) do tenant.
compromissoSchema.index({ Tenant: 1, inicio: 1 });
compromissoSchema.index({ Tenant: 1, Case: 1, inicio: 1 });

export const Compromisso = mongoose.model<CompromissoDocument>('Compromisso', compromissoSchema);
