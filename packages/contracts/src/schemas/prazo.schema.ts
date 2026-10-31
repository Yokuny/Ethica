import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';

// Prazo processual da perícia (AD-109). `protocolado` é o prazo cumprido, com a
// data em que foi entregue; `perdido` fica no histórico sem contar como pendente.
export const PRAZO_STATUS = ['pendente', 'protocolado', 'perdido'] as const;
export type PrazoStatus = (typeof PRAZO_STATUS)[number];

// "Vence em breve" (definido pelo usuário em 2026-10-31).
export const PRAZO_VENCE_EM_BREVE_DIAS = 15;

const prazoFields = z.object({
  titulo: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
  vencimento: calendarDateSchema,
  observacoes: z.string().trim().max(1000, 'observações inválidas').optional(),
});

export const createPrazoSchema = prazoFields.strict();
export type CreatePrazo = z.infer<typeof createPrazoSchema>;

// Protocolar sem data grava hoje; voltar a pendente/perdido apaga a data.
export const updatePrazoSchema = prazoFields
  .partial()
  .extend({ status: z.enum(PRAZO_STATUS).optional(), protocoladoEm: calendarDateSchema.optional() })
  .strict();
export type UpdatePrazo = z.infer<typeof updatePrazoSchema>;
