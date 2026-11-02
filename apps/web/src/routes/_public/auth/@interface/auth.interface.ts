import { signupSchema } from '@ethica/contracts';
import { z } from 'zod';

// ACE-03: the e-mail button opens `/auth?token=…`.
export const authSearchSchema = z
  .object({})
  .passthrough()
  .transform((search) => ({ ...search, token: typeof search.token === 'string' ? search.token : undefined }));

export const accessCodeFormSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'código deve ter 6 dígitos') });
export type AccessCodeForm = z.infer<typeof accessCodeFormSchema>;

// The ticket comes from the confirmed key, never from the person.
export const officeFormSchema = signupSchema.omit({ signupToken: true });
export type OfficeForm = z.infer<typeof officeFormSchema>;

export type AccessStep = 'email' | 'code' | 'office' | 'checking';
export type AccessVerifyResult = { signedIn?: true; signupToken?: string };
