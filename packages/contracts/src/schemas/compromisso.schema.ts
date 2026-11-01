import { z } from 'zod';
import { calendarDateSchema, wallTimeSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

export const COMPROMISSO_TIPOS = ['inspection', 'hearing', 'meeting', 'other'] as const;
export type CompromissoTipo = (typeof COMPROMISSO_TIPOS)[number];

export const COMPROMISSO_STATUS = ['scheduled', 'done', 'canceled'] as const;
export type CompromissoStatus = (typeof COMPROMISSO_STATUS)[number];

// Por que o compromisso foi cancelado no campo (AD-130): adiado ou parte ausente.
export const COMPROMISSO_MOTIVOS = ['postponed', 'absent'] as const;
export type CompromissoMotivo = (typeof COMPROMISSO_MOTIVOS)[number];

// Data e hora chegam em hora de parede; o service converte para o instante UTC.
export const createCompromissoSchema = z
  .object({
    tipo: z.enum(COMPROMISSO_TIPOS),
    titulo: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
    date: calendarDateSchema,
    time: wallTimeSchema,
    duracaoMinutos: z
      .number()
      .int()
      .min(15)
      .max(24 * 60),
    local: z.string().trim().max(200, 'local inválido').optional(),
    caseId: idSchema.optional(),
    observacoes: z.string().trim().max(1000, 'observações inválidas').optional(),
  })
  .strict();
export type CreateCompromisso = z.infer<typeof createCompromissoSchema>;

export const updateCompromissoSchema = createCompromissoSchema
  .partial()
  .extend({ status: z.enum(COMPROMISSO_STATUS).optional(), motivo: z.enum(COMPROMISSO_MOTIVOS).optional() })
  .strict();
export type UpdateCompromisso = z.infer<typeof updateCompromissoSchema>;
