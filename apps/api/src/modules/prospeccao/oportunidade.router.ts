import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
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

const canOperate = checkRole(['admin', 'manager', 'operator']);

export const createProspeccaoRouter = (deps: ProspeccaoRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, canOperate];
  const byId = validParams(oportunidadeIdParamSchema);

  router.post(
    '/datajud/search',
    ...guard,
    datajudSearchRateLimit,
    validBody(datajudSearchSchema),
    oportunidadeController.searchDatajud(deps.datajud),
  );
  router.get('/oportunidades/stats', ...guard, oportunidadeController.oportunidadeStats);
  router.get(
    '/oportunidades',
    ...guard,
    validParsedQuery(listOportunidadesQuerySchema),
    oportunidadeController.listOportunidades,
  );
  router.post(
    '/oportunidades',
    ...guard,
    validBody(createOportunidadeSchema),
    oportunidadeController.createOportunidade,
  );
  router.patch(
    '/oportunidades/:id',
    ...guard,
    byId,
    validBody(updateOportunidadeSchema),
    oportunidadeController.updateOportunidade,
  );
  router.delete('/oportunidades/:id', ...guard, byId, oportunidadeController.deleteOportunidade);
  router.post(
    '/oportunidades/:id/converter',
    ...guard,
    byId,
    validBody(converterOportunidadeSchema),
    oportunidadeController.converterOportunidade,
  );

  return router;
};
