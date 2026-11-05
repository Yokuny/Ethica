import type {
  CaseContractor,
  CasePhase,
  CaseRole,
  CaseStatus,
  CourtType,
  CreateCase,
  CreateMovement,
  MovementType,
  UpdateCase,
} from '@ethica/contracts';
import {
  CASE_PHASES,
  CASE_STATUS,
  COURTTYPES,
  calendarDateSchema,
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

// Pagination validated at the edge (never a silent clamp in the service).
export const listCasesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    phase: z.enum(CASE_PHASES).optional(),
    status: z.enum(CASE_STATUS).optional(),
    courtType: z.enum(COURTTYPES).optional(),
    // "Tipo" filter (AD-177): Perícia or Assistência técnica by `role`, an own type by its name.
    role: z.enum(['court_expert', 'technical_assistant']).optional(),
    serviceType: z.string().trim().min(1).max(80).optional(),
    // "Número de controle" filter: any piece of the service order (OS), the number alone included.
    serviceOrder: z.string().trim().min(1).max(30).optional(),
    // Delivery date of the service: the "Entrega do laudo" / "Entrega do serviço" deadline (AD-177).
    deliveryFrom: calendarDateSchema.optional(),
    deliveryTo: calendarDateSchema.optional(),
  })
  .strict();
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;

export type CaseRouterDeps = { validToken: RequestHandler };

export type CaseRecord = {
  id: string;
  // Missing only in a service type created by the office (AD-158).
  processNumber?: string;
  serviceOrder?: string;
  // Sphere, only in a perícia (AD-178).
  courtType?: CourtType;
  serviceType?: string;
  role: CaseRole;
  // Typed role and phase of the office's own type and the contractor (AD-176, AD-178).
  roleName?: string;
  phaseName?: string;
  contractor?: CaseContractor;
  court?: string;
  division?: string;
  district?: string;
  subject: string;
  parties: CasePartyWrite[];
  phase: CasePhase;
  status: CaseStatus;
  nominationDate?: string;
  proposedFeesCents?: number;
  fixedFeesCents?: number;
  notes?: string;
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
  claimantJob?: string;
  nonPrescribedPeriodStart?: string;
  nonPrescribedPeriodEnd?: string;
  location?: string;
  movements: MovementRecord[];
  opportunityId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Process movement (AD-121), from newest to oldest.
export type MovementRecord = { id: string; type: MovementType; date: string; notes?: string };

// Stalled case (DOC-03): `reference` is the last movement or, without any, the nomination
// or the registration day; `origin` says which one.
export type StalledCase = {
  id: string;
  processNumber?: string;
  phase: CasePhase;
  phaseName?: string;
  court?: string;
  division?: string;
  subject: string;
  reference: string;
  origin: 'movement' | 'appointment' | 'created';
  stalledDays: number;
};

export type CreateCaseInput = CreateCase & { tenant: string; opportunityId?: string };

// What the repository saves: parties already resolved in the registry (AD-117), without the report deadline
// and the perícia date.
export type CaseCreateWrite = Omit<CreateCaseInput, 'reportDeadline' | 'parties' | 'inspection' | 'payment'> & {
  parties: CasePartyWrite[];
};

// Service type created by the office (AD-158), with the role of the cases that use it and the
// phases typed in it (AD-176, AD-178).
export type ServiceTypeItem = { name: string; role: CaseRole; roleName?: string; phases: string[] };
// `null` becomes `$unset` in the repository: fields of the office's own type and erased dates (AD-177).
export type CaseUpdateWrite = Omit<UpdateCase, 'parties' | 'inspection'> & { parties?: CasePartyWrite[] };

// Listing: each case with its nearest pending deadline (missing if there is none).
export type CaseListItem = CaseRecord & { nextDeadline?: NextDeadline };

// Cross-module enrichment (agenda, finance, feed, reminder, reports): number, court and division, and the names of the
// parties on each side (without lawyers), comma-separated.
// `client`: name of whoever hired the technical assistant (AD-135).
export type CaseSummary = {
  processNumber?: string;
  subject: string;
  court?: string;
  division?: string;
  plaintiff?: string;
  defendant?: string;
  client?: string;
};

export type CaseDistribution = {
  phase: { key: string; count: number }[];
  courtType: { key: string; count: number }[];
};
