import { z } from 'zod';

// ACE-01: login and sign-up start from the e-mail alone (AD-155).
const emailSchema = z.string().trim().toLowerCase().email('e-mail inválido');

export const accessKeyRequestSchema = z.object({ email: emailSchema }).strict();

// ACE-03: the e-mail button carries the token; the screen sends the e-mail and the 6-digit code.
export const accessKeyVerifySchema = z.union([
  z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'chave inválida') }).strict(),
  z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/, 'código deve ter 6 dígitos') }).strict(),
]);

// APA-03 (AD-220): the confirmed key (or the new office, or the invite) hands over a short
// ticket that only serves to create the passkey of this device.
export const passkeyRegisterOptionsSchema = z.object({ passkeyToken: z.string().min(1) }).strict();

// WebAuthn answer of the browser (registration or sign-in). Only the outer shape is checked here;
// the WebAuthn library verifies the rest. `challengeToken` came with the options.
export const passkeyResponseSchema = z
  .object({
    challengeToken: z.string().min(1),
    response: z
      .object({
        id: z.string().min(1),
        rawId: z.string().min(1),
        type: z.literal('public-key'),
        response: z.record(z.string(), z.unknown()),
      })
      .passthrough(),
  })
  .strict();

// APA-05: at most one passkey of each kind per person.
export const DEVICE_KINDS = ['desktop', 'mobile'] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

// APA-08: "devices with access" in the account screen. Dates in ISO 8601 (UTC).
export type PasskeyView = { id: string; kind: DeviceKind; label: string; createdAt: string; lastUsedAt?: string };

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
export type PasskeyRegisterOptions = z.infer<typeof passkeyRegisterOptionsSchema>;
export type PasskeyResponse = z.infer<typeof passkeyResponseSchema>;
export type Signup = z.infer<typeof signupSchema>;
