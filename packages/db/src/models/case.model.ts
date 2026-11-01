import {
  CASE_PHASES,
  CASE_ROLES,
  CASE_STATUS,
  type CasePhase,
  type CaseRole,
  type CaseStatus,
  COURTTYPES,
  type CourtType,
  MOVEMENT_TYPES,
  type MovementType,
  PARTY_TYPES,
  type PartyType,
  SIDES,
  type Side,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Parte ligada à perícia. `tipo` e `nome` são cópia do cadastro (AD-117): a busca da
// listagem e o resumo do feed/aviso leem daqui; renomear a parte atualiza a cópia.
export interface CasePartyDocument {
  Party: mongoose.Types.ObjectId;
  side: Side;
  type: PartyType;
  name: string;
  // Quem contratou o assistente técnico (AD-135).
  client?: boolean;
}

// Movimentação do processo que conta para a perícia parada (AD-121). Data `YYYY-MM-DD`.
export interface CaseMovementDocument {
  _id: mongoose.Types.ObjectId;
  type: MovementType;
  date: string;
  notes?: string;
}

export interface CaseDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  processNumber: string;
  courtType: CourtType;
  role: CaseRole;
  court: string;
  division?: string;
  district?: string;
  subject: string;
  parties: CasePartyDocument[];
  status: CaseStatus;
  // Fase detalhada (AD-133), sempre coerente com a etapa (regra no service).
  phase?: CasePhase;
  // Datas de calendário `YYYY-MM-DD` no fuso de exibição (AD-036, AD-103), não instantes.
  nominationDate?: string;
  proposedFeesCents?: number;
  fixedFeesCents?: number;
  notes?: string;
  // Dados auxiliares do laudo trabalhista (IMP-04); datas `YYYY-MM-DD` (AD-103).
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
  claimantJob?: string;
  nonPrescribedPeriodStart?: string;
  nonPrescribedPeriodEnd?: string;
  location?: string;
  movements: CaseMovementDocument[];
  // Perícia que nasceu de uma oportunidade de prospecção (Datajud).
  Opportunity?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<CaseDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    processNumber: { type: String, required: true, trim: true },
    courtType: { type: String, enum: COURTTYPES, required: true },
    role: { type: String, enum: CASE_ROLES, required: true },
    court: { type: String, required: true, trim: true },
    division: { type: String, trim: true },
    district: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    parties: {
      type: [
        new Schema<CasePartyDocument>(
          {
            Party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
            side: { type: String, enum: SIDES, required: true },
            type: { type: String, enum: PARTY_TYPES, required: true },
            name: { type: String, required: true, trim: true },
            client: { type: Boolean },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    status: { type: String, enum: CASE_STATUS, default: 'appointed', required: true },
    phase: { type: String, enum: CASE_PHASES },
    nominationDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    proposedFeesCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    fixedFeesCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    notes: { type: String },
    docketingDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    hireDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    terminationDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    claimantJob: { type: String, trim: true },
    nonPrescribedPeriodStart: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    nonPrescribedPeriodEnd: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    location: { type: String, trim: true },
    movements: {
      type: [
        new Schema<CaseMovementDocument>({
          type: { type: String, enum: MOVEMENT_TYPES, required: true },
          date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
          notes: { type: String, trim: true },
        }),
      ],
      default: [],
    },
    Opportunity: { type: Schema.Types.ObjectId, ref: 'Opportunity' },
  },
  { timestamps: true },
);

// Um processo aparece uma vez por tenant: o perito não pode cadastrar a mesma
// nomeação duas vezes (o índice é quem garante, não o código).
caseSchema.index({ Tenant: 1, processNumber: 1 }, { unique: true });
caseSchema.index({ Tenant: 1, status: 1 });
caseSchema.index({ Tenant: 1, createdAt: -1 });
// Perícias de uma parte (IMP-03) e cópia do nome ao renomear.
caseSchema.index({ Tenant: 1, 'parties.Party': 1 });

export const Case = mongoose.model<CaseDocument>('Case', caseSchema);
