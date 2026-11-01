import { CASE_PHASES, CASE_STATES, CASE_STATUS, COURTTYPES, type CreateCase, type UpdateCase } from '@ethica/contracts';
import { z } from 'zod';

export const casesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  status: z.enum(CASE_STATUS).optional(),
  state: z.enum(CASE_STATES).optional(),
  phase: z.enum(CASE_PHASES).optional(),
  courtType: z.enum(COURTTYPES).optional(),
});
export type CasesSearch = z.infer<typeof casesSearchSchema>;

// Campos do formulário de `add` e `details`: os da edição + o prazo do laudo, que só existe
// no cadastro (vira o prazo "Entrega do laudo", AD-109).
export type CaseFormValues = UpdateCase & Pick<CreateCase, 'reportDeadline'>;
