import {
  JUSTICAS,
  type Justica,
  MOVIMENTACAO_TIPOS,
  type MovimentacaoTipo,
  PAPEIS_PERICIA,
  PARTE_TIPOS,
  type PapelPericia,
  type ParteTipo,
  PERICIA_STATUS,
  type PericiaStatus,
  POLOS,
  type Polo,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Parte ligada à perícia. `tipo` e `nome` são cópia do cadastro (AD-117): a busca da
// listagem e o resumo do feed/aviso leem daqui; renomear a parte atualiza a cópia.
export interface PericiaParteDocument {
  Parte: mongoose.Types.ObjectId;
  polo: Polo;
  tipo: ParteTipo;
  nome: string;
}

// Movimentação do processo que conta para a perícia parada (AD-121). Data `YYYY-MM-DD`.
export interface PericiaMovimentacaoDocument {
  _id: mongoose.Types.ObjectId;
  tipo: MovimentacaoTipo;
  data: string;
  observacoes?: string;
}

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
  partes: PericiaParteDocument[];
  status: PericiaStatus;
  // Datas de calendário `YYYY-MM-DD` no fuso de exibição (AD-036, AD-103), não instantes.
  dataNomeacao?: string;
  honorariosPropostosCents?: number;
  honorariosFixadosCents?: number;
  observacoes?: string;
  // Dados auxiliares do laudo trabalhista (IMP-04); datas `YYYY-MM-DD` (AD-103).
  dataAutuacao?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  funcaoReclamante?: string;
  periodoImprescritoInicio?: string;
  periodoImprescritoFim?: string;
  localPericia?: string;
  movimentacoes: PericiaMovimentacaoDocument[];
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
    partes: {
      type: [
        new Schema<PericiaParteDocument>(
          {
            Parte: { type: Schema.Types.ObjectId, ref: 'Parte', required: true },
            polo: { type: String, enum: POLOS, required: true },
            tipo: { type: String, enum: PARTE_TIPOS, required: true },
            nome: { type: String, required: true, trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    status: { type: String, enum: PERICIA_STATUS, default: 'appointed', required: true },
    dataNomeacao: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    honorariosPropostosCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    honorariosFixadosCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    observacoes: { type: String },
    dataAutuacao: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    dataAdmissao: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    dataDemissao: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    funcaoReclamante: { type: String, trim: true },
    periodoImprescritoInicio: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    periodoImprescritoFim: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    localPericia: { type: String, trim: true },
    movimentacoes: {
      type: [
        new Schema<PericiaMovimentacaoDocument>({
          tipo: { type: String, enum: MOVIMENTACAO_TIPOS, required: true },
          data: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
          observacoes: { type: String, trim: true },
        }),
      ],
      default: [],
    },
    Oportunidade: { type: Schema.Types.ObjectId, ref: 'Oportunidade' },
  },
  { timestamps: true },
);

// Um processo aparece uma vez por tenant: o perito não pode cadastrar a mesma
// nomeação duas vezes (o índice é quem garante, não o código).
periciaSchema.index({ Tenant: 1, numeroProcesso: 1 }, { unique: true });
periciaSchema.index({ Tenant: 1, status: 1 });
periciaSchema.index({ Tenant: 1, createdAt: -1 });
// Perícias de uma parte (IMP-03) e cópia do nome ao renomear.
periciaSchema.index({ Tenant: 1, 'partes.Parte': 1 });

export const Pericia = mongoose.model<PericiaDocument>('Pericia', periciaSchema);
