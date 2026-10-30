import { Router } from 'express';
import { checkRole, isAdmin } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as periciaController from './pericia.controller.js';
import type { PericiaRouterDeps } from './pericia.schema.js';
import {
  createPericiaSchema,
  listPericiasQuerySchema,
  periciaIdParamSchema,
  updatePericiaSchema,
} from './pericia.schema.js';

const canOperate = checkRole(['admin', 'manager', 'operator']);

export const createPericiaRouter = (deps: PericiaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.post('/', ...guard, canOperate, validBody(createPericiaSchema), periciaController.createPericia);
  router.get('/stats', ...guard, canOperate, periciaController.periciaStats);
  router.get('/distribution', ...guard, canOperate, periciaController.periciaDistribution);
  router.get('/', ...guard, canOperate, validParsedQuery(listPericiasQuerySchema), periciaController.listPericias);
  router.get('/:id', ...guard, canOperate, validParams(periciaIdParamSchema), periciaController.getPericia);
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
