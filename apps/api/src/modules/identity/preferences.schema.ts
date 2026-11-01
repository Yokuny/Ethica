import { HOME_BLOCKS, type HomeBlock } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type PreferencesRouterDeps = { validToken: RequestHandler };

// ENR-03: escolhas da própria pessoa — dispensar o guia de primeiros passos e (AD-110)
// receber o aviso diário de prazos por e-mail. O progresso do checklist nunca é gravado aqui.
// Strict: qualquer outra chave (inclusive Tenant, AD-010) é recusada; vazio também.
export const updatePreferencesSchema = z
  .object({
    onboardingDismissed: z.boolean().optional(),
    deadlineReminderEmail: z.boolean().optional(),
    // AD-136: blocos do início que a pessoa escondeu; `[]` restaura o padrão.
    hiddenBlocks: z.array(z.enum(HOME_BLOCKS)).max(HOME_BLOCKS.length).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'nenhuma preferência informada' });

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type UserPreferences = {
  onboardingDismissed: boolean;
  deadlineReminderEmail: boolean;
  hiddenBlocks: HomeBlock[];
};
