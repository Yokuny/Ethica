import { calendarDateSchema } from '@ethica/contracts';
import { z } from 'zod';

// Dia da rota de campo; sem ele, hoje no fuso de exibição.
export const campoSearchSchema = z.object({ date: calendarDateSchema.optional() });
export type CampoSearch = z.infer<typeof campoSearchSchema>;
