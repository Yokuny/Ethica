import { z } from 'zod';

export const vistoriaSearchSchema = z.object({ id: z.string().min(1) });
export type VistoriaSearch = z.infer<typeof vistoriaSearchSchema>;
