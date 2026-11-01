import { LAUDO_STATUS } from '@ethica/contracts';
import { z } from 'zod';

export const laudosSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  status: z.enum(LAUDO_STATUS).optional(),
});
export type LaudosSearch = z.infer<typeof laudosSearchSchema>;
