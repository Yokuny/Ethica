import { CSV_IMPORT_MAX_BYTES, PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { fileBody } from '../../middlewares/fileBody.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as caseController from './case.controller.js';
import type { CaseRouterDeps } from './case.schema.js';
import {
  caseIdParamSchema,
  createCaseSchema,
  createMovementSchema,
  listCasesQuerySchema,
  movementIdParamSchema,
  updateCaseSchema,
} from './case.schema.js';
import * as deadlineController from './deadline.controller.js';
import {
  createDeadlineSchema,
  deadlineIdParamSchema,
  listPendingDeadlinesQuerySchema,
  updateDeadlineSchema,
} from './deadline.schema.js';

export const createCaseRouter = (deps: CaseRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.post('/', ...guard, can('expert_cases', 'create'), validBody(createCaseSchema), caseController.createCase);
  // Importação (AD-114, AD-118): o PDF só devolve o rascunho; o CSV cria as perícias.
  router.post(
    '/import/pdf',
    ...guard,
    can('expert_cases', 'create'),
    fileBody('application/pdf', PDF_IMPORT_MAX_BYTES),
    caseController.importPdf,
  );
  router.post(
    '/import/csv',
    ...guard,
    can('expert_cases', 'create'),
    fileBody('text/csv', CSV_IMPORT_MAX_BYTES),
    caseController.importCsv,
  );
  router.get('/stats', ...guard, can('expert_cases', 'view'), caseController.caseStats);
  router.get('/stalled', ...guard, can('expert_cases', 'view'), caseController.stalledSummary);
  router.get('/distribution', ...guard, can('expert_cases', 'view'), caseController.caseDistribution);
  // Prazos (AD-109) seguem a permissão de perícias (AD-137). `/deadlines` vem antes de `/:id`.
  router.get(
    '/deadlines',
    ...guard,
    can('expert_cases', 'view'),
    validParsedQuery(listPendingDeadlinesQuerySchema),
    deadlineController.listPendingDeadlines,
  );
  router.patch(
    '/deadlines/:deadlineId',
    ...guard,
    can('expert_cases', 'update'),
    validParams(deadlineIdParamSchema),
    validBody(updateDeadlineSchema),
    deadlineController.updateDeadline,
  );
  router.delete(
    '/deadlines/:deadlineId',
    ...guard,
    can('expert_cases', 'update'),
    validParams(deadlineIdParamSchema),
    deadlineController.deleteDeadline,
  );
  router.get(
    '/',
    ...guard,
    can('expert_cases', 'view'),
    validParsedQuery(listCasesQuerySchema),
    caseController.listCases,
  );
  router.get('/:id', ...guard, can('expert_cases', 'view'), validParams(caseIdParamSchema), caseController.getCase);
  router.get(
    '/:id/deadlines',
    ...guard,
    can('expert_cases', 'view'),
    validParams(caseIdParamSchema),
    deadlineController.listCaseDeadlines,
  );
  router.post(
    '/:id/deadlines',
    ...guard,
    can('expert_cases', 'update'),
    validParams(caseIdParamSchema),
    validBody(createDeadlineSchema),
    deadlineController.createDeadline,
  );
  // Movimentações que contam para a perícia parada (AD-121).
  router.post(
    '/:id/movements',
    ...guard,
    can('expert_cases', 'update'),
    validParams(caseIdParamSchema),
    validBody(createMovementSchema),
    caseController.addMovement,
  );
  router.delete(
    '/:id/movements/:movementId',
    ...guard,
    can('expert_cases', 'update'),
    validParams(movementIdParamSchema),
    caseController.removeMovement,
  );
  router.patch(
    '/:id',
    ...guard,
    can('expert_cases', 'update'),
    validParams(caseIdParamSchema),
    validBody(updateCaseSchema),
    caseController.updateCase,
  );
  router.delete(
    '/:id',
    ...guard,
    can('expert_cases', 'delete'),
    validParams(caseIdParamSchema),
    caseController.deleteCase,
  );

  return router;
};
