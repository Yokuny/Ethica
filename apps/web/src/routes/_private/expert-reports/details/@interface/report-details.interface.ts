import { z } from 'zod';

// `secao`: seção aberta no editor; sem ela, a primeira.
export const reportDetailsSearchSchema = z.object({ id: z.string().min(1), section: z.string().min(1).optional() });
export type ReportDetailsSearch = z.infer<typeof reportDetailsSearchSchema>;
