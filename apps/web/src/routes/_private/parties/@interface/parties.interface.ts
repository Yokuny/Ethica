import { PARTY_LIST_SORTS, PARTY_TYPES, SORT_ORDERS } from '@ethica/contracts';
import { z } from 'zod';

export const partiesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  type: z.enum(PARTY_TYPES).optional(),
  sort: z.enum(PARTY_LIST_SORTS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
});
export type PartiesSearch = z.infer<typeof partiesSearchSchema>;
