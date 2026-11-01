import { z } from 'zod';

// Perícia e modelo escolhidos ficam na URL: o detalhe da perícia abre já com `periciaId`.
export const reportAddSearchSchema = z.object({
  caseId: z.string().min(1).optional(),
  templateId: z.string().min(1).optional(),
});
export type ReportAddSearch = z.infer<typeof reportAddSearchSchema>;
