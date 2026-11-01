import { createCaseSchema, OPPORTUNITY_STATUS } from '@ethica/contracts';
import { z } from 'zod';

export const opportunitiesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  status: z.enum(OPPORTUNITY_STATUS).optional(),
});
export type OpportunitiesSearch = z.infer<typeof opportunitiesSearchSchema>;

// Same slice as the API `convertOpportunitySchema`.
export const convertFormSchema = createCaseSchema
  .pick({ courtType: true, role: true, subject: true, nominationDate: true, reportDeadline: true })
  .strict();
export type ConvertForm = z.infer<typeof convertFormSchema>;
