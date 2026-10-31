import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as parteController from './parte.controller.js';
import { createParteSchema, listPartesQuerySchema, parteIdParamSchema, updateParteSchema } from './parte.schema.js';
import type { PericiaRouterDeps } from './pericia.schema.js';

// Partes e advogados são operação (AD-107): qualquer papel do tenant.
const canOperate = checkRole(['admin', 'manager', 'operator']);

export const createParteRouter = (deps: PericiaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, canOperate];

  router.post('/', ...guard, validBody(createParteSchema), parteController.createParte);
  router.get('/', ...guard, validParsedQuery(listPartesQuerySchema), parteController.listPartes);
  router.get('/:id', ...guard, validParams(parteIdParamSchema), parteController.getParte);
  router.get('/:id/pericias', ...guard, validParams(parteIdParamSchema), parteController.listPericiasDaParte);
  router.patch(
    '/:id',
    ...guard,
    validParams(parteIdParamSchema),
    validBody(updateParteSchema),
    parteController.updateParte,
  );

  return router;
};
