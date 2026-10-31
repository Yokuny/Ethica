import { z } from 'zod';

// ACC-03: mesma regra de nome do aceite de convite (acceptInvite.schema.ts).
// DOC-01: dados profissionais que vão nos documentos técnicos; `''` apaga o campo.
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
    registroProfissional: z.string().trim().max(60, 'registro inválido').optional(),
    formacao: z.string().trim().max(120, 'formação inválida').optional(),
  })
  .strict();

// ACC-04: a nova senha segue o mínimo do aceite de convite; a confirmação é só do formulário.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'senha atual é obrigatória'),
    newPassword: z.string().min(8, 'senha deve ter no mínimo 8 caracteres'),
  })
  .strict();

// ACC-02: o navegador já recorta e reduz a foto (256×256 WebP). O teto de 100 mil
// caracteres mantém o corpo dentro do limite padrão do express.json (100 kB).
export const updateAvatarSchema = z
  .object({
    image: z
      .string()
      .max(100_000, 'imagem muito grande')
      .regex(/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/, 'imagem inválida'),
  })
  .strict();

export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateAvatar = z.infer<typeof updateAvatarSchema>;
