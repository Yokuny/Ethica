import { createPericiaSchema, OPORTUNIDADE_STATUS } from '@ethica/contracts';
import { z } from 'zod';

export const oportunidadesSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  status: z.enum(OPORTUNIDADE_STATUS).optional(),
});
export type OportunidadesSearch = z.infer<typeof oportunidadesSearchSchema>;

// Mesmo recorte do `converterOportunidadeSchema` da API.
export const converterFormSchema = createPericiaSchema
  .pick({ justica: true, papel: true, objeto: true, dataNomeacao: true, prazoLaudo: true })
  .strict();
export type ConverterForm = z.infer<typeof converterFormSchema>;
