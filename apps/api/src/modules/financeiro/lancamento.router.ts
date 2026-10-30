import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as lancamentoController from './lancamento.controller.js';
import type { FinanceiroRouterDeps } from './lancamento.schema.js';
import {
  categoriasQuerySchema,
  createLancamentoSchema,
  fluxoQuerySchema,
  lancamentoIdParamSchema,
  listLancamentosQuerySchema,
  updateLancamentoSchema,
} from './lancamento.schema.js';

// Dinheiro do perito: só admin e manager leem e escrevem o financeiro.
const canManage = checkRole(['admin', 'manager']);

export const createFinanceiroRouter = (deps: FinanceiroRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, canManage];

  router.get('/resumo', ...guard, lancamentoController.resumo);
  router.get('/fluxo', ...guard, validParsedQuery(fluxoQuerySchema), lancamentoController.fluxoMensal);
  router.get('/categorias', ...guard, validParsedQuery(categoriasQuerySchema), lancamentoController.totaisPorCategoria);
  router.post('/lancamentos', ...guard, validBody(createLancamentoSchema), lancamentoController.createLancamento);
  router.get(
    '/lancamentos',
    ...guard,
    validParsedQuery(listLancamentosQuerySchema),
    lancamentoController.listLancamentos,
  );
  router.patch(
    '/lancamentos/:id',
    ...guard,
    validParams(lancamentoIdParamSchema),
    validBody(updateLancamentoSchema),
    lancamentoController.updateLancamento,
  );
  router.delete(
    '/lancamentos/:id',
    ...guard,
    validParams(lancamentoIdParamSchema),
    lancamentoController.deleteLancamento,
  );

  return router;
};
