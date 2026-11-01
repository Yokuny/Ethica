import { z } from 'zod';
import { permissionsSchema } from './permission.schema.js';

export const createInviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('e-mail inválido'),
    role: z.enum(['admin', 'manager', 'operator']),
    // Matrix granted in the invite (AD-137); ignored for admin, profile preset when missing.
    permissions: permissionsSchema.optional(),
  })
  .strict();

export type CreateInvite = z.infer<typeof createInviteSchema>;
