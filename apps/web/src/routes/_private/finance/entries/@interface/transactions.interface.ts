import { SORT_ORDERS, TRANSACTION_KINDS, TRANSACTION_LIST_SORTS } from '@ethica/contracts';
import { z } from 'zod';
import type { TransactionRecord } from '@/query/transaction.js';

export const transactionsSearchSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
  kind: z.enum(TRANSACTION_KINDS).optional(),
  state: z.enum(['expected', 'partial', 'settled', 'canceled', 'overdue']).optional(),
  caseId: z.string().optional(),
  sort: z.enum(TRANSACTION_LIST_SORTS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
});
export type TransactionsSearch = z.infer<typeof transactionsSearchSchema>;

export type TransactionPanel =
  | { kind: 'create' }
  | { kind: 'edit'; transaction: TransactionRecord }
  | { kind: 'receive'; transaction: TransactionRecord }
  | { kind: 'pay'; transaction: TransactionRecord }
  | null;
