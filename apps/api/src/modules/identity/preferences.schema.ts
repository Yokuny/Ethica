import type { RequestHandler } from 'express';
import { z } from 'zod';

export type PreferencesRouterDeps = { validToken: RequestHandler };

// ENR-03: só a escolha de interface "dispensar o guia de primeiros passos".
// O progresso do checklist nunca é gravado aqui — vem dos fatos (operations).
// Strict: qualquer outra chave (inclusive Tenant, AD-010) é recusada.
export const updatePreferencesSchema = z.object({ onboardingDismissed: z.boolean() }).strict();

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type UserPreferences = { onboardingDismissed: boolean };
