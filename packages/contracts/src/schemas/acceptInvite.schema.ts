import { z } from 'zod';

// ACE-05: the invite link already proves the e-mail; only the name is asked (AD-155).
export const acceptInviteSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'nome deve ter entre 3 e 80 caracteres')
      .max(80, 'nome deve ter entre 3 e 80 caracteres'),
  })
  .strict();

export type AcceptInvite = z.infer<typeof acceptInviteSchema>;
