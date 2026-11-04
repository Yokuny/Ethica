import type {
  ApiMessageKey,
  BrazilianState,
  CourtDivisionCsvColumn,
  CourtType,
  CreateCourtDivision,
  UpdateCourtDivision,
} from '@ethica/contracts';
import {
  BRAZILIAN_STATES,
  COURTTYPES,
  createCourtDivisionSchema,
  idSchema,
  updateCourtDivisionSchema,
} from '@ethica/contracts';
import { z } from 'zod';

export type { CreateCourtDivision, UpdateCourtDivision };
export { createCourtDivisionSchema, updateCourtDivisionSchema };

export const courtDivisionIdParamSchema = z.object({ id: idSchema }).strict();

// Without pagination: the state and city filters already narrow it down (AD-151); 500 at most.
export const listCourtDivisionsQuerySchema = z
  .object({
    state: z.enum(BRAZILIAN_STATES).optional(),
    city: z.string().trim().max(120).optional(),
    courtType: z.enum(COURTTYPES).optional(),
  })
  .strict();
export type ListCourtDivisionsQuery = z.infer<typeof listCourtDivisionsQuerySchema>;

export const courtDivisionCitiesQuerySchema = z.object({ state: z.enum(BRAZILIAN_STATES) }).strict();

export type CourtDivisionRecord = {
  id: string;
  courtType: CourtType;
  name: string;
  court?: string;
  state: BrazilianState;
  city: string;
  address?: string;
  phones?: string;
  email?: string;
  virtualDesk?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CourtDivisionImportResult = {
  created: number;
  skipped: { line: number; name: string }[];
  rejected: { line: number; column?: CourtDivisionCsvColumn; reason: ApiMessageKey }[];
};
