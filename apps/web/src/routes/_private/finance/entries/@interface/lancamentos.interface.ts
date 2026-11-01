import { LANCAMENTO_NATUREZAS } from '@ethica/contracts';
import { z } from 'zod';
import type { LancamentoRecord } from '@/query/lancamento.js';

export const lancamentosSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  natureza: z.enum(LANCAMENTO_NATUREZAS).optional(),
  situacao: z.enum(['expected', 'partial', 'settled', 'canceled', 'overdue']).optional(),
  periciaId: z.string().optional(),
});
export type LancamentosSearch = z.infer<typeof lancamentosSearchSchema>;

export type LancamentoPanel =
  | { kind: 'create' }
  | { kind: 'edit'; lancamento: LancamentoRecord }
  | { kind: 'receber'; lancamento: LancamentoRecord }
  | null;
