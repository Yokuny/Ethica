import { Router } from 'express';
import { can, isAdmin } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as documentosController from './documentos.controller.js';
import { type DocumentosRouterDeps, documentCaseParamSchema, financeReportQuerySchema } from './documentos.schema.js';

// O relatório financeiro exige também ver o financeiro (AD-137).

// PDFs (AD-119) e exportação de dados (AD-122). Montado em `/documents`.
export const createDocumentosRouter = (deps: DocumentosRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const providers = { pdf: deps.pdf, storage: deps.storage };
  const byId = validParams(documentCaseParamSchema);

  router.get(
    '/expert-cases/:id/sheet',
    ...guard,
    can('expert_cases', 'view'),
    byId,
    documentosController.sheet(providers),
  );
  router.get(
    '/expert-cases/:id/checklist',
    ...guard,
    can('expert_cases', 'view'),
    byId,
    documentosController.checklist(providers),
  );
  router.get('/deadlines', ...guard, can('reports', 'view'), documentosController.cronograma(providers));
  router.get('/stalled', ...guard, can('reports', 'view'), documentosController.stalled(providers));
  router.get(
    '/finance',
    ...guard,
    can('reports', 'view'),
    can('finance', 'view'),
    validParsedQuery(financeReportQuerySchema),
    documentosController.finance(providers),
  );
  router.get('/export', ...guard, isAdmin, documentosController.exportar);
  return router;
};
