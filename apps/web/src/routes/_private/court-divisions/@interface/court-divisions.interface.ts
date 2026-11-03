import { BRAZILIAN_STATES, JUDICIAL_COURT_TYPES } from '@ethica/contracts';
import { z } from 'zod';

export const courtDivisionsSearchSchema = z.object({
  state: z.enum(BRAZILIAN_STATES).optional(),
  city: z.string().optional(),
  courtType: z.enum(JUDICIAL_COURT_TYPES).optional(),
  q: z.string().optional().default(''),
});
export type CourtDivisionsSearch = z.infer<typeof courtDivisionsSearchSchema>;
