import type { CourtProcessView, TrackedCase } from '@ethica/contracts';
import { idSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CourtProcessView, TrackedCase };

export type AutomationRouterDeps = { validToken: RequestHandler };

export const automationCaseParamSchema = z.object({ id: idSchema }).strict();
