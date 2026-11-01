import type { CreateOpportunity, DatajudCourt, OpportunityStatus, UpdateOpportunity } from '@ethica/contracts';
import {
  createCaseSchema,
  createOpportunitySchema,
  datajudSearchSchema,
  idSchema,
  OPPORTUNITY_STATUS,
  updateOpportunitySchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { DatajudClient, DatajudProcess } from '../../providers/datajudClient.js';

export type { CreateOpportunity, UpdateOpportunity };
export { createOpportunitySchema, datajudSearchSchema, updateOpportunitySchema };

export const opportunityIdParamSchema = z.object({ id: idSchema }).strict();

export const listOpportunitiesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(OPPORTUNITY_STATUS).optional(),
  })
  .strict();
export type ListOpportunitiesQuery = z.infer<typeof listOpportunitiesQuerySchema>;

// Convert into a case: the number, the court and the division come from the opportunity; the
// expert only provides what Datajud does not bring.
export const convertOpportunitySchema = createCaseSchema
  .pick({ courtType: true, role: true, subject: true, nominationDate: true, reportDeadline: true })
  .strict();
export type ConvertOpportunity = z.infer<typeof convertOpportunitySchema>;

export type ProspectingRouterDeps = { validToken: RequestHandler; datajud?: DatajudClient };

export type OpportunityRecord = {
  id: string;
  processNumber: string;
  court: DatajudCourt;
  caseClass?: string;
  subjects: string[];
  courtUnit?: string;
  filingDate?: string;
  lastMovement?: string;
  lastMovementAt?: string;
  status: OpportunityStatus;
  notes?: string;
  caseId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Search result marked with whatever was already saved as an opportunity.
export type DatajudResult = DatajudProcess & { opportunityId?: string };
