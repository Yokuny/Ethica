import { PARTE_TIPOS } from '@ethica/contracts';
import { z } from 'zod';

export const partesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  tipo: z.enum(PARTE_TIPOS).optional(),
});
export type PartesSearch = z.infer<typeof partesSearchSchema>;
