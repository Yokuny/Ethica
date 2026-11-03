import { z } from 'zod';

export const reportDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type ReportDetailsSearch = z.infer<typeof reportDetailsSearchSchema>;
