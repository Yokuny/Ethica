import { Router } from 'express';
import { checkRole, isAdmin } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as documentosController from './documentos.controller.js';
import {
  type DocumentosRouterDeps,
  documentoPericiaParamSchema,
  financeiroReportQuerySchema,
} from './documentos.schema.js';

const canOperate = checkRole(['admin', 'manager', 'operator']);
// Mesmo papel do router `/financeiro` (AD-107).
const canManage = checkRole(['admin', 'manager']);

// PDFs (AD-119) e exportação de dados (AD-122). Montado em `/documentos`.
export const createDocumentosRouter = (deps: DocumentosRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const providers = { pdf: deps.pdf, storage: deps.storage };
  const byId = validParams(documentoPericiaParamSchema);

  router.get('/pericias/:id/ficha', ...guard, canOperate, byId, documentosController.ficha(providers));
  router.get('/pericias/:id/checklist', ...guard, canOperate, byId, documentosController.checklist(providers));
  router.get('/prazos', ...guard, canOperate, documentosController.cronograma(providers));
  router.get('/paradas', ...guard, canOperate, documentosController.paradas(providers));
  router.get(
    '/financeiro',
    ...guard,
    canManage,
    validParsedQuery(financeiroReportQuerySchema),
    documentosController.financeiro(providers),
  );
  router.get('/export', ...guard, isAdmin, documentosController.exportar);
  return router;
};
