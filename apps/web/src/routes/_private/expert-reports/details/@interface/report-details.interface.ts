import { z } from 'zod';

// `section`: section open in the editor; without it, the first one.
export const reportDetailsSearchSchema = z.object({ id: z.string().min(1), section: z.string().min(1).optional() });
export type ReportDetailsSearch = z.infer<typeof reportDetailsSearchSchema>;
