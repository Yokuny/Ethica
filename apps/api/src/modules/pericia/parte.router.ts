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

  router.post('/', ...guard, can('parties', 'create'), validBody(createParteSchema), parteController.createParte);
  router.get(
    '/',
    ...guard,
    can('parties', 'view'),
    validParsedQuery(listPartesQuerySchema),
    parteController.listPartes,
  );
  router.get('/:id', ...guard, can('parties', 'view'), validParams(parteIdParamSchema), parteController.getParte);
  router.get(
    '/:id/expert-cases',
    ...guard,
    can('parties', 'view'),
    validParams(parteIdParamSchema),
    parteController.listPericiasDaParte,
  );
  router.patch(
    '/:id',
    ...guard,
    can('parties', 'update'),
    validParams(parteIdParamSchema),
    validBody(updateParteSchema),
    parteController.updateParte,
  );

  return router;
};
