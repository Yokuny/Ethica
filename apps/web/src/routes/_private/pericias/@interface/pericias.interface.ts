import { JUSTICAS, PERICIA_STATUS } from '@ethica/contracts';
import { z } from 'zod';

export const periciasSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  status: z.enum(PERICIA_STATUS).optional(),
  justica: z.enum(JUSTICAS).optional(),
});
export type PericiasSearch = z.infer<typeof periciasSearchSchema>;
