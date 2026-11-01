import { PARTY_TYPES } from '@ethica/contracts';
import { z } from 'zod';

export const partiesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  type: z.enum(PARTY_TYPES).optional(),
});
export type PartiesSearch = z.infer<typeof partiesSearchSchema>;
