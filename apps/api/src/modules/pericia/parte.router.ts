import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as parteController from './parte.controller.js';
import { createParteSchema, listPartesQuerySchema, parteIdParamSchema, updateParteSchema } from './parte.schema.js';
import type { PericiaRouterDeps } from './pericia.schema.js';

export const createParteRouter = (deps: PericiaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.post('/', ...guard, can('partes', 'create'), validBody(createParteSchema), parteController.createParte);
  router.get('/', ...guard, can('partes', 'view'), validParsedQuery(listPartesQuerySchema), parteController.listPartes);
  router.get('/:id', ...guard, can('partes', 'view'), validParams(parteIdParamSchema), parteController.getParte);
  router.get(
    '/:id/pericias',
    ...guard,
    can('partes', 'view'),
    validParams(parteIdParamSchema),
    parteController.listPericiasDaParte,
  );
  router.patch(
    '/:id',
    ...guard,
    can('partes', 'update'),
    validParams(parteIdParamSchema),
    validBody(updateParteSchema),
    parteController.updateParte,
  );

  return router;
};
