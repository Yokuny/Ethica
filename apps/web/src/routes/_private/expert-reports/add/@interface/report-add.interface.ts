import { z } from 'zod';

// The chosen case and template stay in the URL: the case detail already opens with `caseId`.
export const reportAddSearchSchema = z.object({
  caseId: z.string().min(1).optional(),
  templateId: z.string().min(1).optional(),
});
export type ReportAddSearch = z.infer<typeof reportAddSearchSchema>;
