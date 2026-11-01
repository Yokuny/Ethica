import type {
  CasePhase,
  CaseRole,
  CaseState,
  CaseStatus,
  CourtType,
  CreateCase,
  CreateMovement,
  MovementType,
  UpdateCase,
} from '@ethica/contracts';
import {
  CASE_PHASES,
  CASE_STATES,
  CASE_STATUS,
  COURTTYPES,
  createCaseSchema,
  createMovementSchema,
  idSchema,
  updateCaseSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { NextDeadline } from './deadline.schema.js';
import type { CasePartyWrite } from './party.schema.js';

export type { CreateCase, CreateMovement, UpdateCase };
export { createCaseSchema, createMovementSchema, updateCaseSchema };

export const caseIdParamSchema = z.object({ id: idSchema }).strict();
export const movementIdParamSchema = z.object({ id: idSchema, movementId: idSchema }).strict();

// Paginação validada na borda (nunca clamp silencioso no service).
export const listCasesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    status: z.enum(CASE_STATUS).optional(),
    state: z.enum(CASE_STATES).optional(),
    phase: z.enum(CASE_PHASES).optional(),
    courtType: z.enum(COURTTYPES).optional(),
  })
  .strict();
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;

export type CaseRouterDeps = { validToken: RequestHandler };

export type CaseRecord = {
  id: string;
  processNumber: string;
  courtType: CourtType;
  role: CaseRole;
  court: string;
  division?: string;
  district?: string;
  subject: string;
  parties: CasePartyWrite[];
  status: CaseStatus;
  phase?: CasePhase;
  // Derivada da etapa e da fase (AD-133), nunca gravada.
  state: CaseState;
  nominationDate?: string;
  proposedFeesCents?: number;
  fixedFeesCents?: number;
  observacoes?: string;
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
  claimantJob?: string;
  nonPrescribedPeriodStart?: string;
  nonPrescribedPeriodEnd?: string;
  location?: string;
  movements: MovementRecord[];
  oportunidadeId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Movimentação do processo (AD-121), da mais recente para a mais antiga.
export type MovementRecord = { id: string; tipo: MovementType; data: string; observacoes?: string };

// Perícia parada (DOC-03): `referencia` é a última movimentação ou, sem nenhuma, a nomeação
// ou o dia do cadastro; `origem` diz qual delas.
export type StalledCase = {
  id: string;
  processNumber: string;
  status: CaseStatus;
  court: string;
  division?: string;
  subject: string;
  referencia: string;
  origem: 'movement' | 'appointment' | 'created';
  stalledDays: number;
};

export type CreateCaseInput = CreateCase & { tenant: string; oportunidadeId?: string };

// O que o repository grava: partes já resolvidas no cadastro (AD-117), sem o prazo do laudo.
export type CaseCreateWrite = Omit<CreateCaseInput, 'reportDeadline' | 'parties'> & { parties: CasePartyWrite[] };
// `fase: null` vira `$unset` no repository (AD-133).
export type CaseUpdateWrite = Omit<UpdateCase, 'parties'> & { parties?: CasePartyWrite[] };

// Listagem: cada perícia com o prazo pendente mais próximo (ausente se não há).
export type CaseListItem = CaseRecord & { nextDeadline?: NextDeadline };

// Enriquecimento cross-módulo (agenda, financeiro, feed, aviso): número e os nomes das
// partes de cada polo (sem advogados), separados por vírgula.
// `contratante`: nome de quem contratou o assistente técnico (AD-135).
export type CaseSummary = { processNumber: string; plaintiff?: string; defendant?: string; client?: string };

export type CaseDistribution = {
  status: { key: string; count: number }[];
  courtType: { key: string; count: number }[];
};
