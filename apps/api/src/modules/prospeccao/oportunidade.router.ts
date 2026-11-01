import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { datajudSearchRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as oportunidadeController from './oportunidade.controller.js';
import type { ProspeccaoRouterDeps } from './oportunidade.schema.js';
import {
  converterOportunidadeSchema,
  createOportunidadeSchema,
  datajudSearchSchema,
  listOportunidadesQuerySchema,
  oportunidadeIdParamSchema,
  updateOportunidadeSchema,
} from './oportunidade.schema.js';

export const createProspeccaoRouter = (deps: ProspeccaoRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const byId = validParams(oportunidadeIdParamSchema);

  router.post(
    '/datajud/search',
    ...guard,
    can('prospecting', 'view'),
    datajudSearchRateLimit,
    validBody(datajudSearchSchema),
    oportunidadeController.searchDatajud(deps.datajud),
  );
  router.get('/opportunities/stats', ...guard, can('prospecting', 'view'), oportunidadeController.oportunidadeStats);
  router.get(
    '/opportunities',
    ...guard,
    can('prospecting', 'view'),
    validParsedQuery(listOportunidadesQuerySchema),
    oportunidadeController.listOportunidades,
  );
  router.post(
    '/opportunities',
    ...guard,
    can('prospecting', 'create'),
    validBody(createOportunidadeSchema),
    oportunidadeController.createOportunidade,
  );
  router.patch(
    '/opportunities/:id',
    ...guard,
    can('prospecting', 'update'),
    byId,
    validBody(updateOportunidadeSchema),
    oportunidadeController.updateOportunidade,
  );
  router.delete(
    '/opportunities/:id',
    ...guard,
    can('prospecting', 'delete'),
    byId,
    oportunidadeController.deleteOportunidade,
  );
  router.post(
    '/opportunities/:id/convert',
    ...guard,
    can('prospecting', 'update'),
    can('expert_cases', 'create'),
    byId,
    validBody(converterOportunidadeSchema),
    oportunidadeController.converterOportunidade,
  );

  return router;
};
