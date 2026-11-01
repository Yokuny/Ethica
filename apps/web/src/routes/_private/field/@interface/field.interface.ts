import { calendarDateSchema } from '@ethica/contracts';
import { z } from 'zod';

// Dia da rota de campo; sem ele, hoje no fuso de exibição.
export const fieldSearchSchema = z.object({ date: calendarDateSchema.optional() });
export type FieldSearch = z.infer<typeof fieldSearchSchema>;
