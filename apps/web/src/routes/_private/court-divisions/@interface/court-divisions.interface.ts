import { BRAZILIAN_STATES, COURTTYPES } from '@ethica/contracts';
import { z } from 'zod';

export const courtDivisionsSearchSchema = z.object({
  state: z.enum(BRAZILIAN_STATES).optional(),
  city: z.string().optional(),
  courtType: z.enum(COURTTYPES).optional(),
  q: z.string().optional().default(''),
});
export type CourtDivisionsSearch = z.infer<typeof courtDivisionsSearchSchema>;
