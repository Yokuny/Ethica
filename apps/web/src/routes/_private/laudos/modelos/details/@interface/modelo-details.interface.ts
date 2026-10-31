import { z } from 'zod';

export const modeloDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type ModeloDetailsSearch = z.infer<typeof modeloDetailsSearchSchema>;
