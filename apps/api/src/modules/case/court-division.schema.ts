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
  queryListSchema,
  updateCourtDivisionSchema,
} from '@ethica/contracts';
import { z } from 'zod';

export type { CreateCourtDivision, UpdateCourtDivision };
export { createCourtDivisionSchema, updateCourtDivisionSchema };

export const courtDivisionIdParamSchema = z.object({ id: idSchema }).strict();

// Without pagination: the state and city filters already narrow it down (AD-151); 500 at most.
export const listCourtDivisionsQuerySchema = z
  .object({
    state: queryListSchema(z.enum(BRAZILIAN_STATES)),
    city: queryListSchema(z.string().trim().min(1).max(120)),
    courtType: queryListSchema(z.enum(COURTTYPES)),
  })
  .strict();
export type ListCourtDivisionsQuery = z.infer<typeof listCourtDivisionsQuerySchema>;

export const courtDivisionCitiesQuerySchema = z
  .object({ state: z.preprocess((value) => [value].flat(), z.array(z.enum(BRAZILIAN_STATES)).min(1)) })
  .strict();

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
