import { Router } from 'express';
import { isAdmin } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as diarioController from './diario.controller.js';
import { type DiarioRouterDeps, listDiarioQuerySchema } from './diario.schema.js';

// Diário de bordo (AD-134): só o admin consulta. Montado em `/tenant/activity-log`.
export const createDiarioRouter = (deps: DiarioRouterDeps): Router => {
  const router = Router();
  router.get(
    '/',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    validParsedQuery(listDiarioQuerySchema),
    diarioController.listAtividades,
  );
  return router;
};
