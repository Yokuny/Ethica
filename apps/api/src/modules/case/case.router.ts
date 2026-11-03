import { CSV_IMPORT_MAX_BYTES, PDF_IMPORT_MAX_BYTES, serviceOrderSettingsSchema } from '@ethica/contracts';
import { Router } from 'express';
import { can, isAdmin } from '../../middlewares/authorization.middleware.js';
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
import { createDeadlineSchema, deadlineIdParamSchema, updateDeadlineSchema } from './deadline.schema.js';
import { csvImportQuerySchema } from './import.schema.js';

export const createCaseRouter = (deps: CaseRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.post('/', ...guard, can('expert_cases', 'create'), validBody(createCaseSchema), caseController.createCase);
  // Import (AD-114, AD-118): the PDF (or a ZIP with its parts, AD-173) only returns the draft; the CSV creates the cases.
  router.post(
    '/import/pdf',
    ...guard,
    can('expert_cases', 'create'),
    fileBody(['application/pdf', 'application/zip'], PDF_IMPORT_MAX_BYTES),
    caseController.importPdf,
  );
  // Any spreadsheet (RSV-04): first the columns with the suggested field, then the import with the checked ones.
  router.post(
    '/import/csv/columns',
    ...guard,
    can('expert_cases', 'create'),
    fileBody('text/csv', CSV_IMPORT_MAX_BYTES),
    caseController.csvColumns,
  );
  router.post(
    '/import/csv',
    ...guard,
    can('expert_cases', 'create'),
    validParsedQuery(csvImportQuerySchema),
    fileBody('text/csv', CSV_IMPORT_MAX_BYTES),
    caseController.importCsv,
  );
  router.get('/stats', ...guard, can('expert_cases', 'view'), caseController.caseStats);
  router.get('/stalled', ...guard, can('expert_cases', 'view'), caseController.stalledSummary);
  router.get('/distribution', ...guard, can('expert_cases', 'view'), caseController.caseDistribution);
  router.get('/service-types', ...guard, can('expert_cases', 'view'), caseController.listServiceTypes);
  // Service order sequence of the office (NLA-01): set up by the admin on the office screen.
  router.get('/service-order', ...guard, can('expert_cases', 'view'), caseController.getServiceOrder);
  router.put(
    '/service-order',
    ...guard,
    isAdmin,
    validBody(serviceOrderSettingsSchema),
    caseController.setServiceOrder,
  );
  // Deadlines (AD-109) follow the cases permission (AD-137); the agenda gets them by event (AD-169).
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
  // Movements that count for the stalled case (AD-121).
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
