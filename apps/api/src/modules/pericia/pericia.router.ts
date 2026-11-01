import { CSV_IMPORT_MAX_BYTES, PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { fileBody } from '../../middlewares/fileBody.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as periciaController from './pericia.controller.js';
import type { PericiaRouterDeps } from './pericia.schema.js';
import {
  createMovimentacaoSchema,
  createPericiaSchema,
  listPericiasQuerySchema,
  movimentacaoIdParamSchema,
  periciaIdParamSchema,
  updatePericiaSchema,
} from './pericia.schema.js';
import * as prazoController from './prazo.controller.js';
import {
  createPrazoSchema,
  listPrazosPendentesQuerySchema,
  prazoIdParamSchema,
  updatePrazoSchema,
} from './prazo.schema.js';

export const createPericiaRouter = (deps: PericiaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.post(
    '/',
    ...guard,
    can('pericias', 'create'),
    validBody(createPericiaSchema),
    periciaController.createPericia,
  );
  // Importação (AD-114, AD-118): o PDF só devolve o rascunho; o CSV cria as perícias.
  router.post(
    '/import/pdf',
    ...guard,
    can('pericias', 'create'),
    fileBody('application/pdf', PDF_IMPORT_MAX_BYTES),
    periciaController.importarPdf,
  );
  router.post(
    '/import/csv',
    ...guard,
    can('pericias', 'create'),
    fileBody('text/csv', CSV_IMPORT_MAX_BYTES),
    periciaController.importarCsv,
  );
  router.get('/stats', ...guard, can('pericias', 'view'), periciaController.periciaStats);
  router.get('/paradas', ...guard, can('pericias', 'view'), periciaController.resumoParadas);
  router.get('/distribution', ...guard, can('pericias', 'view'), periciaController.periciaDistribution);
  // Prazos (AD-109) seguem a permissão de perícias (AD-137). `/prazos` vem antes de `/:id`.
  router.get(
    '/prazos',
    ...guard,
    can('pericias', 'view'),
    validParsedQuery(listPrazosPendentesQuerySchema),
    prazoController.listPrazosPendentes,
  );
  router.patch(
    '/prazos/:prazoId',
    ...guard,
    can('pericias', 'update'),
    validParams(prazoIdParamSchema),
    validBody(updatePrazoSchema),
    prazoController.updatePrazo,
  );
  router.delete(
    '/prazos/:prazoId',
    ...guard,
    can('pericias', 'update'),
    validParams(prazoIdParamSchema),
    prazoController.deletePrazo,
  );
  router.get(
    '/',
    ...guard,
    can('pericias', 'view'),
    validParsedQuery(listPericiasQuerySchema),
    periciaController.listPericias,
  );
  router.get(
    '/:id',
    ...guard,
    can('pericias', 'view'),
    validParams(periciaIdParamSchema),
    periciaController.getPericia,
  );
  router.get(
    '/:id/prazos',
    ...guard,
    can('pericias', 'view'),
    validParams(periciaIdParamSchema),
    prazoController.listPrazosDaPericia,
  );
  router.post(
    '/:id/prazos',
    ...guard,
    can('pericias', 'update'),
    validParams(periciaIdParamSchema),
    validBody(createPrazoSchema),
    prazoController.createPrazo,
  );
  // Movimentações que contam para a perícia parada (AD-121).
  router.post(
    '/:id/movimentacoes',
    ...guard,
    can('pericias', 'update'),
    validParams(periciaIdParamSchema),
    validBody(createMovimentacaoSchema),
    periciaController.addMovimentacao,
  );
  router.delete(
    '/:id/movimentacoes/:movimentacaoId',
    ...guard,
    can('pericias', 'update'),
    validParams(movimentacaoIdParamSchema),
    periciaController.removeMovimentacao,
  );
  router.patch(
    '/:id',
    ...guard,
    can('pericias', 'update'),
    validParams(periciaIdParamSchema),
    validBody(updatePericiaSchema),
    periciaController.updatePericia,
  );
  router.delete(
    '/:id',
    ...guard,
    can('pericias', 'delete'),
    validParams(periciaIdParamSchema),
    periciaController.deletePericia,
  );

  return router;
};
