import { z } from 'zod';

// ACC-03: same name rule as the invite acceptance (acceptInvite.schema.ts).
// DOC-01: professional data that goes on the technical documents; `''` clears the field.
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'nome deve ter entre 3 e 80 caracteres')
      .max(80, 'nome deve ter entre 3 e 80 caracteres'),
    cpf: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value === '' || /^\d{11}$/.test(value), 'CPF inválido')
      .optional(),
    professionalRegistration: z.string().trim().max(60, 'registro inválido').optional(),
    education: z.string().trim().max(120, 'formação inválida').optional(),
  })
  .strict();

// ACC-04: the new password follows the invite acceptance minimum; the confirmation belongs only to the form.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'senha atual é obrigatória'),
    newPassword: z.string().min(8, 'senha deve ter no mínimo 8 caracteres'),
  })
  .strict();

// ACC-02: the browser already crops and shrinks the photo (256×256 WebP). The ceiling of 100 thousand
// characters keeps the body within the express.json default limit (100 kB).
export const updateAvatarSchema = z
  .object({
    image: z
      .string()
      .max(100_000, 'imagem muito grande')
      .regex(/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/, 'imagem inválida'),
  })
  .strict();

// Home blocks (AD-136). The preference keeps the hidden ones: a new block shows by default.
export const HOME_BLOCKS = [
  'overview',
  'upcoming',
  'cash_flow',
  'stalled',
  'by_stage',
  'by_court',
  'sections',
] as const;
export type HomeBlock = (typeof HOME_BLOCKS)[number];

export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateAvatar = z.infer<typeof updateAvatarSchema>;
