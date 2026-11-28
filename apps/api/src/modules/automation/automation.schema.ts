import type { CourtLookup, CourtProcessView, TrackedCase } from '@ethica/contracts';
import { idSchema, processNumberSchema } from '@ethica/contracts';
import type { DatajudClient } from '@ethica/datajud';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CourtLookup, CourtProcessView, DatajudClient, TrackedCase };

export type AutomationRouterDeps = { validToken: RequestHandler; datajud?: DatajudClient };

export const automationCaseParamSchema = z.object({ id: idSchema }).strict();
export const courtLookupQuerySchema = z.object({ processNumber: processNumberSchema }).strict();
