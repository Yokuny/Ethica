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
    can('expert_cases', 'create'),
    validBody(createPericiaSchema),
    periciaController.createPericia,
  );
  // Importação (AD-114, AD-118): o PDF só devolve o rascunho; o CSV cria as perícias.
  router.post(
    '/import/pdf',
    ...guard,
    can('expert_cases', 'create'),
    fileBody('application/pdf', PDF_IMPORT_MAX_BYTES),
    periciaController.importarPdf,
  );
  router.post(
    '/import/csv',
    ...guard,
    can('expert_cases', 'create'),
    fileBody('text/csv', CSV_IMPORT_MAX_BYTES),
    periciaController.importarCsv,
  );
  router.get('/stats', ...guard, can('expert_cases', 'view'), periciaController.periciaStats);
  router.get('/stalled', ...guard, can('expert_cases', 'view'), periciaController.resumoParadas);
  router.get('/distribution', ...guard, can('expert_cases', 'view'), periciaController.periciaDistribution);
  // Prazos (AD-109) seguem a permissão de perícias (AD-137). `/deadlines` vem antes de `/:id`.
  router.get(
    '/deadlines',
    ...guard,
    can('expert_cases', 'view'),
    validParsedQuery(listPrazosPendentesQuerySchema),
    prazoController.listPrazosPendentes,
  );
  router.patch(
    '/deadlines/:prazoId',
    ...guard,
    can('expert_cases', 'update'),
    validParams(prazoIdParamSchema),
    validBody(updatePrazoSchema),
    prazoController.updatePrazo,
  );
  router.delete(
    '/deadlines/:prazoId',
    ...guard,
    can('expert_cases', 'update'),
    validParams(prazoIdParamSchema),
    prazoController.deletePrazo,
  );
  router.get(
    '/',
    ...guard,
    can('expert_cases', 'view'),
    validParsedQuery(listPericiasQuerySchema),
    periciaController.listPericias,
  );
  router.get(
    '/:id',
    ...guard,
    can('expert_cases', 'view'),
    validParams(periciaIdParamSchema),
    periciaController.getPericia,
  );
  router.get(
    '/:id/deadlines',
    ...guard,
    can('expert_cases', 'view'),
    validParams(periciaIdParamSchema),
    prazoController.listPrazosDaPericia,
  );
  router.post(
    '/:id/deadlines',
    ...guard,
    can('expert_cases', 'update'),
    validParams(periciaIdParamSchema),
    validBody(createPrazoSchema),
    prazoController.createPrazo,
  );
  // Movimentações que contam para a perícia parada (AD-121).
  router.post(
    '/:id/movements',
    ...guard,
    can('expert_cases', 'update'),
    validParams(periciaIdParamSchema),
    validBody(createMovimentacaoSchema),
    periciaController.addMovimentacao,
  );
  router.delete(
    '/:id/movements/:movimentacaoId',
    ...guard,
    can('expert_cases', 'update'),
    validParams(movimentacaoIdParamSchema),
    periciaController.removeMovimentacao,
  );
  router.patch(
    '/:id',
    ...guard,
    can('expert_cases', 'update'),
    validParams(periciaIdParamSchema),
    validBody(updatePericiaSchema),
    periciaController.updatePericia,
  );
  router.delete(
    '/:id',
    ...guard,
    can('expert_cases', 'delete'),
    validParams(periciaIdParamSchema),
    periciaController.deletePericia,
  );

  return router;
};
