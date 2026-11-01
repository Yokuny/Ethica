import { DIARIO_ACOES, DIARIO_MODULOS, type DiarioAcao, type DiarioModulo } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Diário de bordo (AD-134): uma entrada por ação de escrita bem-sucedida, exportação ou
// entrada no sistema. Nome e rótulo são gravados para a entrada sobreviver à exclusão
// do usuário ou do registro.
export interface AtividadeDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  User: mongoose.Types.ObjectId;
  userName: string;
  modulo: DiarioModulo;
  recurso?: string;
  acao: DiarioAcao;
  registroId?: string;
  rotulo?: string;
  createdAt: Date;
}

// Guarda de 1 ano (AD-134): o índice TTL apaga a entrada sozinho.
export const ATIVIDADE_TTL_SEGUNDOS = 365 * 24 * 60 * 60;

const atividadeSchema = new Schema<AtividadeDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    User: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    modulo: { type: String, enum: DIARIO_MODULOS, required: true },
    recurso: { type: String },
    acao: { type: String, enum: DIARIO_ACOES, required: true },
    registroId: { type: String },
    rotulo: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

atividadeSchema.index({ Tenant: 1, createdAt: -1 });
atividadeSchema.index({ Tenant: 1, User: 1, createdAt: -1 });
atividadeSchema.index({ createdAt: 1 }, { expireAfterSeconds: ATIVIDADE_TTL_SEGUNDOS });

export const Atividade = mongoose.model<AtividadeDocument>('Atividade', atividadeSchema);
