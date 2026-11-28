import { SORT_ORDERS, TRANSACTION_KINDS, TRANSACTION_LIST_SORTS } from '@ethica/contracts';
import { z } from 'zod';
import type { TransactionRecord } from '@/query/transaction.js';

export const transactionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
  kind: z.enum(TRANSACTION_KINDS).optional(),
  state: z.enum(['expected', 'partial', 'settled', 'canceled', 'overdue']).optional(),
  caseId: z.string().optional(),
  sort: z.enum(TRANSACTION_LIST_SORTS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
});
export type TransactionsSearch = z.infer<typeof transactionsSearchSchema>;

export type TransactionPanel =
  | { kind: 'create' }
  | { kind: 'receive'; transaction: TransactionRecord }
  | { kind: 'pay'; transaction: TransactionRecord }
  | null;

// The entry page (SGD-02): `?id=`.
export const transactionDetailsSearchSchema = z.object({ id: z.string().min(1) });
export type TransactionDetailsSearch = z.infer<typeof transactionDetailsSearchSchema>;
