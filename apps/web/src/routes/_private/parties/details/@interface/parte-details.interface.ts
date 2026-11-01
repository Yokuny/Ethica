import { z } from 'zod';

export const parteDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type ParteDetailsSearch = z.infer<typeof parteDetailsSearchSchema>;
