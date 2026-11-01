import { z } from 'zod';

export const templateDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type TemplateDetailsSearch = z.infer<typeof templateDetailsSearchSchema>;
