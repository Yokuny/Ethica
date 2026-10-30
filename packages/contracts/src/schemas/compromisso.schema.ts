import { z } from 'zod';
import { calendarDateSchema, wallTimeSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

export const COMPROMISSO_TIPOS = ['vistoria', 'audiencia', 'prazo', 'reuniao', 'outro'] as const;
export type CompromissoTipo = (typeof COMPROMISSO_TIPOS)[number];

export const COMPROMISSO_STATUS = ['agendado', 'concluido', 'cancelado'] as const;
export type CompromissoStatus = (typeof COMPROMISSO_STATUS)[number];

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
    periciaId: idSchema.optional(),
    observacoes: z.string().trim().max(1000, 'observações inválidas').optional(),
  })
  .strict();
export type CreateCompromisso = z.infer<typeof createCompromissoSchema>;

export const updateCompromissoSchema = createCompromissoSchema
  .partial()
  .extend({ status: z.enum(COMPROMISSO_STATUS).optional() })
  .strict();
export type UpdateCompromisso = z.infer<typeof updateCompromissoSchema>;
