import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import type { CaseRouterDeps } from './case.schema.js';
import * as partyController from './party.controller.js';
import { createPartySchema, listPartiesQuerySchema, partyIdParamSchema, updatePartySchema } from './party.schema.js';

export const createPartyRouter = (deps: CaseRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.post('/', ...guard, can('parties', 'create'), validBody(createPartySchema), partyController.createParty);
  router.get(
    '/',
    ...guard,
    can('parties', 'view'),
    validParsedQuery(listPartiesQuerySchema),
    partyController.listParties,
  );
  router.get('/:id', ...guard, can('parties', 'view'), validParams(partyIdParamSchema), partyController.getParty);
  router.get(
    '/:id/expert-cases',
    ...guard,
    can('parties', 'view'),
    validParams(partyIdParamSchema),
    partyController.listPartyCases,
  );
  router.patch(
    '/:id',
    ...guard,
    can('parties', 'update'),
    validParams(partyIdParamSchema),
    validBody(updatePartySchema),
    partyController.updateParty,
  );

  return router;
};
