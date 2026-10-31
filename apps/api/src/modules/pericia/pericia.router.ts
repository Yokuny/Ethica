import { CSV_IMPORT_MAX_BYTES, PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { Router } from 'express';
import { checkRole, isAdmin } from '../../middlewares/authorization.middleware.js';
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

const canOperate = checkRole(['admin', 'manager', 'operator']);

export const createPericiaRouter = (deps: PericiaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.post('/', ...guard, canOperate, validBody(createPericiaSchema), periciaController.createPericia);
  // Importação (AD-114, AD-118): o PDF só devolve o rascunho; o CSV cria as perícias.
  router.post(
    '/import/pdf',
    ...guard,
    canOperate,
    fileBody('application/pdf', PDF_IMPORT_MAX_BYTES),
    periciaController.importarPdf,
  );
  router.post(
    '/import/csv',
    ...guard,
    canOperate,
    fileBody('text/csv', CSV_IMPORT_MAX_BYTES),
    periciaController.importarCsv,
  );
  router.get('/stats', ...guard, canOperate, periciaController.periciaStats);
  router.get('/distribution', ...guard, canOperate, periciaController.periciaDistribution);
  // Prazos (AD-109): operacionais, qualquer papel do tenant. `/prazos` vem antes de `/:id`.
  router.get(
    '/prazos',
    ...guard,
    canOperate,
    validParsedQuery(listPrazosPendentesQuerySchema),
    prazoController.listPrazosPendentes,
  );
  router.patch(
    '/prazos/:prazoId',
    ...guard,
    canOperate,
    validParams(prazoIdParamSchema),
    validBody(updatePrazoSchema),
    prazoController.updatePrazo,
  );
  router.delete('/prazos/:prazoId', ...guard, canOperate, validParams(prazoIdParamSchema), prazoController.deletePrazo);
  router.get('/', ...guard, canOperate, validParsedQuery(listPericiasQuerySchema), periciaController.listPericias);
  router.get('/:id', ...guard, canOperate, validParams(periciaIdParamSchema), periciaController.getPericia);
  router.get(
    '/:id/prazos',
    ...guard,
    canOperate,
    validParams(periciaIdParamSchema),
    prazoController.listPrazosDaPericia,
  );
  router.post(
    '/:id/prazos',
    ...guard,
    canOperate,
    validParams(periciaIdParamSchema),
    validBody(createPrazoSchema),
    prazoController.createPrazo,
  );
  // Movimentações que contam para a perícia parada (AD-121): qualquer papel do tenant.
  router.post(
    '/:id/movimentacoes',
    ...guard,
    canOperate,
    validParams(periciaIdParamSchema),
    validBody(createMovimentacaoSchema),
    periciaController.addMovimentacao,
  );
  router.delete(
    '/:id/movimentacoes/:movimentacaoId',
    ...guard,
    canOperate,
    validParams(movimentacaoIdParamSchema),
    periciaController.removeMovimentacao,
  );
  router.patch(
    '/:id',
    ...guard,
    canOperate,
    validParams(periciaIdParamSchema),
    validBody(updatePericiaSchema),
    periciaController.updatePericia,
  );
  router.delete('/:id', ...guard, isAdmin, validParams(periciaIdParamSchema), periciaController.deletePericia);

  return router;
};
