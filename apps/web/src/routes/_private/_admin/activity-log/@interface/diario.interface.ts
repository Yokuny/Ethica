import { DIARIO_ACOES, DIARIO_MODULOS } from '@ethica/contracts';
import { z } from 'zod';

export const diarioSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().optional(),
  modulo: z.enum(DIARIO_MODULOS).optional(),
  acao: z.enum(DIARIO_ACOES).optional(),
});
export type DiarioSearch = z.infer<typeof diarioSearchSchema>;
