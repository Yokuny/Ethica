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

  router.get('/resumo', ...guard, can('financeiro', 'view'), lancamentoController.resumo);
  router.get(
    '/fluxo',
    ...guard,
    can('financeiro', 'view'),
    validParsedQuery(fluxoQuerySchema),
    lancamentoController.fluxoMensal,
  );
  router.get(
    '/categorias',
    ...guard,
    can('financeiro', 'view'),
    validParsedQuery(categoriasQuerySchema),
    lancamentoController.totaisPorCategoria,
  );
  router.post(
    '/lancamentos',
    ...guard,
    can('financeiro', 'create'),
    validBody(createLancamentoSchema),
    lancamentoController.createLancamento,
  );
  router.get(
    '/lancamentos',
    ...guard,
    can('financeiro', 'view'),
    validParsedQuery(listLancamentosQuerySchema),
    lancamentoController.listLancamentos,
  );
  router.patch(
    '/lancamentos/:id',
    ...guard,
    can('financeiro', 'update'),
    validParams(lancamentoIdParamSchema),
    validBody(updateLancamentoSchema),
    lancamentoController.updateLancamento,
  );
  router.delete(
    '/lancamentos/:id',
    ...guard,
    can('financeiro', 'delete'),
    validParams(lancamentoIdParamSchema),
    lancamentoController.deleteLancamento,
  );
  // Recebimentos parciais do honorário (AD-111).
  router.post(
    '/lancamentos/:id/parcelas',
    ...guard,
    can('financeiro', 'update'),
    validParams(lancamentoIdParamSchema),
    validBody(createParcelaSchema),
    lancamentoController.addParcela,
  );
  router.delete(
    '/lancamentos/:id/parcelas/:parcelaId',
    ...guard,
    can('financeiro', 'update'),
    validParams(parcelaIdParamSchema),
    lancamentoController.estornarParcela,
  );

  return router;
};
