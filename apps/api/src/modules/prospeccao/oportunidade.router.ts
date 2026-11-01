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
    can('prospeccao', 'view'),
    datajudSearchRateLimit,
    validBody(datajudSearchSchema),
    oportunidadeController.searchDatajud(deps.datajud),
  );
  router.get('/oportunidades/stats', ...guard, can('prospeccao', 'view'), oportunidadeController.oportunidadeStats);
  router.get(
    '/oportunidades',
    ...guard,
    can('prospeccao', 'view'),
    validParsedQuery(listOportunidadesQuerySchema),
    oportunidadeController.listOportunidades,
  );
  router.post(
    '/oportunidades',
    ...guard,
    can('prospeccao', 'create'),
    validBody(createOportunidadeSchema),
    oportunidadeController.createOportunidade,
  );
  router.patch(
    '/oportunidades/:id',
    ...guard,
    can('prospeccao', 'update'),
    byId,
    validBody(updateOportunidadeSchema),
    oportunidadeController.updateOportunidade,
  );
  router.delete(
    '/oportunidades/:id',
    ...guard,
    can('prospeccao', 'delete'),
    byId,
    oportunidadeController.deleteOportunidade,
  );
  router.post(
    '/oportunidades/:id/converter',
    ...guard,
    can('prospeccao', 'update'),
    can('pericias', 'create'),
    byId,
    validBody(converterOportunidadeSchema),
    oportunidadeController.converterOportunidade,
  );

  return router;
};
