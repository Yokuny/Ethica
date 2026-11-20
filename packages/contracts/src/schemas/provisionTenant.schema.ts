import { z } from 'zod';
import { tenantDocumentSchema } from './access.schema.js';

export const provisionTenantSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'nome deve ter entre 3 e 120 caracteres')
      .max(120, 'nome deve ter entre 3 e 120 caracteres'),
    document: tenantDocumentSchema,
  })
  .strict();

export type ProvisionTenant = z.infer<typeof provisionTenantSchema>;
