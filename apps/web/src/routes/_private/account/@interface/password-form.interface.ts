import { changePasswordSchema } from '@ethica/contracts';
import { z } from 'zod';
import { t } from '@/lib/helpers/translate.helper.js';

// The confirmation only exists in the form; the API gets `changePasswordSchema`.
export const passwordFormSchema = changePasswordSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: t('passwords_do_not_match'),
  });

export type PasswordForm = z.infer<typeof passwordFormSchema>;
