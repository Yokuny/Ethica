import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as lancamentoController from './lancamento.controller.js';
import type { FinanceiroRouterDeps } from './lancamento.schema.js';
import {
  categoriasQuerySchema,
  createLancamentoSchema,
  createParcelaSchema,
  fluxoQuerySchema,
  lancamentoIdParamSchema,
  listLancamentosQuerySchema,
  parcelaIdParamSchema,
  updateLancamentoSchema,
} from './lancamento.schema.js';

export const createFinanceiroRouter = (deps: FinanceiroRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.get('/summary', ...guard, can('finance', 'view'), lancamentoController.resumo);
  router.get(
    '/flow',
    ...guard,
    can('finance', 'view'),
    validParsedQuery(fluxoQuerySchema),
    lancamentoController.fluxoMensal,
  );
  router.get(
    '/categories',
    ...guard,
    can('finance', 'view'),
    validParsedQuery(categoriasQuerySchema),
    lancamentoController.totaisPorCategoria,
  );
  router.post(
    '/entries',
    ...guard,
    can('finance', 'create'),
    validBody(createLancamentoSchema),
    lancamentoController.createLancamento,
  );
  router.get(
    '/entries',
    ...guard,
    can('finance', 'view'),
    validParsedQuery(listLancamentosQuerySchema),
    lancamentoController.listLancamentos,
  );
  router.patch(
    '/entries/:id',
    ...guard,
    can('finance', 'update'),
    validParams(lancamentoIdParamSchema),
    validBody(updateLancamentoSchema),
    lancamentoController.updateLancamento,
  );
  router.delete(
    '/entries/:id',
    ...guard,
    can('finance', 'delete'),
    validParams(lancamentoIdParamSchema),
    lancamentoController.deleteLancamento,
  );
  // Recebimentos parciais do honorário (AD-111).
  router.post(
    '/entries/:id/installments',
    ...guard,
    can('finance', 'update'),
    validParams(lancamentoIdParamSchema),
    validBody(createParcelaSchema),
    lancamentoController.addParcela,
  );
  router.delete(
    '/entries/:id/installments/:parcelaId',
    ...guard,
    can('finance', 'update'),
    validParams(parcelaIdParamSchema),
    lancamentoController.estornarParcela,
  );

  return router;
};
