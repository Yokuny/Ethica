import type {
  AutomationDashboard,
  CourtLookup,
  CourtProcessView,
  TrackedCase,
  TrackedCasesList,
} from '@ethica/contracts';
import {
  idSchema,
  processNumberSchema,
  queryListSchema,
  SORT_ORDERS,
  TRACKED_CASE_SORTS,
  TRACKED_CASE_STATUSES,
} from '@ethica/contracts';
import type { DatajudClient } from '@ethica/datajud';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { AutomationDashboard, CourtLookup, CourtProcessView, DatajudClient, TrackedCase, TrackedCasesList };

export type AutomationRouterDeps = { validToken: RequestHandler; datajud?: DatajudClient };

export const automationCaseParamSchema = z.object({ id: idSchema }).strict();
export const courtLookupQuerySchema = z.object({ processNumber: processNumberSchema }).strict();

// The tracked cases of the Automação page (PAT-03): number search, situation filter, column sort (AD-192); without a
// sort, the newest movement first.
export const listTrackedCasesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(40).optional(),
    state: queryListSchema(z.enum(TRACKED_CASE_STATUSES)),
    sort: z.enum(TRACKED_CASE_SORTS).default('lastMovementAt'),
    order: z.enum(SORT_ORDERS).default('desc'),
  })
  .strict();
export type ListTrackedCasesQuery = z.infer<typeof listTrackedCasesQuerySchema>;
