import { Router } from 'express';
import { can, isAdmin } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as documentosController from './documentos.controller.js';
import {
  type DocumentosRouterDeps,
  documentoPericiaParamSchema,
  financeiroReportQuerySchema,
} from './documentos.schema.js';

// O relatório financeiro exige também ver o financeiro (AD-137).

// PDFs (AD-119) e exportação de dados (AD-122). Montado em `/documentos`.
export const createDocumentosRouter = (deps: DocumentosRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const providers = { pdf: deps.pdf, storage: deps.storage };
  const byId = validParams(documentoPericiaParamSchema);

  router.get('/pericias/:id/ficha', ...guard, can('pericias', 'view'), byId, documentosController.ficha(providers));
  router.get(
    '/pericias/:id/checklist',
    ...guard,
    can('pericias', 'view'),
    byId,
    documentosController.checklist(providers),
  );
  router.get('/prazos', ...guard, can('relatorios', 'view'), documentosController.cronograma(providers));
  router.get('/paradas', ...guard, can('relatorios', 'view'), documentosController.paradas(providers));
  router.get(
    '/financeiro',
    ...guard,
    can('relatorios', 'view'),
    can('financeiro', 'view'),
    validParsedQuery(financeiroReportQuerySchema),
    documentosController.financeiro(providers),
  );
  router.get('/export', ...guard, isAdmin, documentosController.exportar);
  return router;
};
