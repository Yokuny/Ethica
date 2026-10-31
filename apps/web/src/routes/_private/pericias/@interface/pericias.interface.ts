import { type CreatePericia, JUSTICAS, PERICIA_STATUS, type UpdatePericia } from '@ethica/contracts';
import { z } from 'zod';

export const periciasSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  q: z.string().optional().default(''),
  status: z.enum(PERICIA_STATUS).optional(),
  justica: z.enum(JUSTICAS).optional(),
});
export type PericiasSearch = z.infer<typeof periciasSearchSchema>;

// Campos do formulário de `add` e `details`: os da edição + o prazo do laudo, que só existe
// no cadastro (vira o prazo "Entrega do laudo", AD-109).
export type PericiaFormValues = UpdatePericia & Pick<CreatePericia, 'prazoLaudo'>;
