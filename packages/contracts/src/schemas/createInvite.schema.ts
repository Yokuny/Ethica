import { z } from 'zod';
import { permissoesSchema } from './permissao.schema.js';

export const createInviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('e-mail inválido'),
    role: z.enum(['admin', 'manager', 'operator']),
    // Matriz conferida no convite (AD-137); ignorada para admin, preset do perfil quando ausente.
    permissoes: permissoesSchema.optional(),
  })
  .strict();

export type CreateInvite = z.infer<typeof createInviteSchema>;
