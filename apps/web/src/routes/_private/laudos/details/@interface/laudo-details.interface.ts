import { z } from 'zod';

// `secao`: seção aberta no editor; sem ela, a primeira.
export const laudoDetailsSearchSchema = z.object({ id: z.string().min(1), secao: z.string().min(1).optional() });
export type LaudoDetailsSearch = z.infer<typeof laudoDetailsSearchSchema>;
