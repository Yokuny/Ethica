import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';

// Prazo processual da perícia (AD-109). `protocolado` é o prazo cumprido, com a
// data em que foi entregue; `perdido` fica no histórico sem contar como pendente.
export const DEADLINE_STATUS = ['pending', 'filed', 'missed'] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUS)[number];

// "Vence em breve" (definido pelo usuário em 2026-10-31).
export const DEADLINE_DUE_SOON_DAYS = 15;

const deadlineFields = z.object({
  titulo: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
  vencimento: calendarDateSchema,
  observacoes: z.string().trim().max(1000, 'observações inválidas').optional(),
});

export const createDeadlineSchema = deadlineFields.strict();
export type CreateDeadline = z.infer<typeof createDeadlineSchema>;

// Protocolar sem data grava hoje; voltar a pendente/perdido apaga a data.
export const updateDeadlineSchema = deadlineFields
  .partial()
  .extend({ status: z.enum(DEADLINE_STATUS).optional(), filedDate: calendarDateSchema.optional() })
  .strict();
export type UpdateDeadline = z.infer<typeof updateDeadlineSchema>;
