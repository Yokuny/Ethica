import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as transactionController from './transaction.controller.js';
import type { FinanceRouterDeps } from './transaction.schema.js';
import {
  categoriesQuerySchema,
  createInstallmentSchema,
  createTransactionSchema,
  flowQuerySchema,
  installmentIdParamSchema,
  listTransactionsQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema,
} from './transaction.schema.js';

export const createFinanceRouter = (deps: FinanceRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.get('/summary', ...guard, can('finance', 'view'), transactionController.summary);
  router.get(
    '/flow',
    ...guard,
    can('finance', 'view'),
    validParsedQuery(flowQuerySchema),
    transactionController.monthlyFlow,
  );
  router.get(
    '/categories',
    ...guard,
    can('finance', 'view'),
    validParsedQuery(categoriesQuerySchema),
    transactionController.totalsByCategory,
  );
  router.post(
    '/entries',
    ...guard,
    can('finance', 'create'),
    validBody(createTransactionSchema),
    transactionController.createTransaction,
  );
  router.get(
    '/entries',
    ...guard,
    can('finance', 'view'),
    validParsedQuery(listTransactionsQuerySchema),
    transactionController.listTransactions,
  );
  router.patch(
    '/entries/:id',
    ...guard,
    can('finance', 'update'),
    validParams(transactionIdParamSchema),
    validBody(updateTransactionSchema),
    transactionController.updateTransaction,
  );
  router.delete(
    '/entries/:id',
    ...guard,
    can('finance', 'delete'),
    validParams(transactionIdParamSchema),
    transactionController.deleteTransaction,
  );
  // Partial fee receipts (AD-111).
  router.post(
    '/entries/:id/installments',
    ...guard,
    can('finance', 'update'),
    validParams(transactionIdParamSchema),
    validBody(createInstallmentSchema),
    transactionController.addInstallment,
  );
  router.delete(
    '/entries/:id/installments/:installmentId',
    ...guard,
    can('finance', 'update'),
    validParams(installmentIdParamSchema),
    transactionController.reverseInstallment,
  );

  return router;
};
