import { z } from 'zod';

// BIB-01: the open library (default: the standard one).
export const TEMPLATE_LIBRARIES = ['standard', 'office'] as const;
export const templatesSearchSchema = z.object({ library: z.enum(TEMPLATE_LIBRARIES).optional() });
export type TemplatesSearch = z.infer<typeof templatesSearchSchema>;
