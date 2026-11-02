import { z } from 'zod';

// ACE-01: login and sign-up start from the e-mail alone (AD-155).
const emailSchema = z.string().trim().toLowerCase().email('e-mail inválido');

export const accessKeyRequestSchema = z.object({ email: emailSchema }).strict();

// ACE-03: the e-mail button carries the token; the screen sends the e-mail and the 6-digit code.
export const accessKeyVerifySchema = z.union([
  z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'chave inválida') }).strict(),
  z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/, 'código deve ter 6 dígitos') }).strict(),
]);

// ACE-04: e-mail confirmed without an account creates its own office, with the person as admin.
// Office only with CNPJ, like provisionTenantSchema (AD-144).
export const signupSchema = z
  .object({
    signupToken: z.string().min(1),
    name: z
      .string()
      .trim()
      .min(3, 'nome deve ter entre 3 e 80 caracteres')
      .max(80, 'nome deve ter entre 3 e 80 caracteres'),
    officeName: z
      .string()
      .trim()
      .min(3, 'nome deve ter entre 3 e 120 caracteres')
      .max(120, 'nome deve ter entre 3 e 120 caracteres'),
    document: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value.length === 14, 'documento deve ter 14 dígitos (CNPJ)'),
  })
  .strict();

export type AccessKeyRequest = z.infer<typeof accessKeyRequestSchema>;
export type AccessKeyVerify = z.infer<typeof accessKeyVerifySchema>;
export type Signup = z.infer<typeof signupSchema>;
