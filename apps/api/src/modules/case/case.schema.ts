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

// Pagination validated at the edge (never a silent clamp in the service).
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
  // Derived from status and phase (AD-133), never stored.
  state: CaseState;
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
  processNumber: string;
  status: CaseStatus;
  court: string;
  division?: string;
  subject: string;
  reference: string;
  origin: 'movement' | 'appointment' | 'created';
  stalledDays: number;
};

export type CreateCaseInput = CreateCase & { tenant: string; opportunityId?: string };

// What the repository saves: parties already resolved in the registry (AD-117), without the report deadline.
export type CaseCreateWrite = Omit<CreateCaseInput, 'reportDeadline' | 'parties'> & { parties: CasePartyWrite[] };
// `phase: null` becomes `$unset` in the repository (AD-133).
export type CaseUpdateWrite = Omit<UpdateCase, 'parties'> & { parties?: CasePartyWrite[] };

// Listing: each case with its nearest pending deadline (missing if there is none).
export type CaseListItem = CaseRecord & { nextDeadline?: NextDeadline };

// Cross-module enrichment (agenda, finance, feed, reminder): number and the names of the
// parties on each side (without lawyers), comma-separated.
// `client`: name of whoever hired the technical assistant (AD-135).
export type CaseSummary = { processNumber: string; plaintiff?: string; defendant?: string; client?: string };

export type CaseDistribution = {
  status: { key: string; count: number }[];
  courtType: { key: string; count: number }[];
};
