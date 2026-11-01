import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { datajudSearchRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as opportunityController from './opportunity.controller.js';
import type { ProspectingRouterDeps } from './opportunity.schema.js';
import {
  convertOpportunitySchema,
  createOpportunitySchema,
  datajudSearchSchema,
  listOpportunitiesQuerySchema,
  opportunityIdParamSchema,
  updateOpportunitySchema,
} from './opportunity.schema.js';

export const createProspectingRouter = (deps: ProspectingRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const byId = validParams(opportunityIdParamSchema);

  router.post(
    '/datajud/search',
    ...guard,
    can('prospecting', 'view'),
    datajudSearchRateLimit,
    validBody(datajudSearchSchema),
    opportunityController.searchDatajud(deps.datajud),
  );
  router.get('/opportunities/stats', ...guard, can('prospecting', 'view'), opportunityController.opportunityStats);
  router.get(
    '/opportunities',
    ...guard,
    can('prospecting', 'view'),
    validParsedQuery(listOpportunitiesQuerySchema),
    opportunityController.listOpportunities,
  );
  router.post(
    '/opportunities',
    ...guard,
    can('prospecting', 'create'),
    validBody(createOpportunitySchema),
    opportunityController.createOpportunity,
  );
  router.patch(
    '/opportunities/:id',
    ...guard,
    can('prospecting', 'update'),
    byId,
    validBody(updateOpportunitySchema),
    opportunityController.updateOpportunity,
  );
  router.delete(
    '/opportunities/:id',
    ...guard,
    can('prospecting', 'delete'),
    byId,
    opportunityController.deleteOpportunity,
  );
  router.post(
    '/opportunities/:id/convert',
    ...guard,
    can('prospecting', 'update'),
    can('expert_cases', 'create'),
    byId,
    validBody(convertOpportunitySchema),
    opportunityController.convertOpportunity,
  );

  return router;
};
