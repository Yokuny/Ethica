import { createCaseSchema, OPORTUNIDADE_STATUS } from '@ethica/contracts';
import { z } from 'zod';

export const oportunidadesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  status: z.enum(OPORTUNIDADE_STATUS).optional(),
});
export type OportunidadesSearch = z.infer<typeof oportunidadesSearchSchema>;

// Mesmo recorte do `converterOportunidadeSchema` da API.
export const converterFormSchema = createCaseSchema
  .pick({ courtType: true, role: true, subject: true, nominationDate: true, reportDeadline: true })
  .strict();
export type ConverterForm = z.infer<typeof converterFormSchema>;
