import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

// Diário de bordo (AD-134): módulos e ações registrados. Chaves em inglês, traduzidas no web (AD-113).
export const DIARIO_MODULOS = [
  'pericias',
  'partes',
  'agenda',
  'laudos',
  'modelos',
  'financeiro',
  'prospeccao',
  'escritorio',
  'usuarios',
  'conta',
] as const;
export type DiarioModulo = (typeof DIARIO_MODULOS)[number];

export const DIARIO_ACOES = [
  'create',
  'update',
  'delete',
  'complete',
  'convert',
  'import',
  'export',
  'notify',
  'signin',
] as const;
export type DiarioAcao = (typeof DIARIO_ACOES)[number];

export const listDiarioQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
    userId: idSchema.optional(),
    modulo: z.enum(DIARIO_MODULOS).optional(),
    acao: z.enum(DIARIO_ACOES).optional(),
  })
  .strict();
export type ListDiarioQuery = z.infer<typeof listDiarioQuerySchema>;
