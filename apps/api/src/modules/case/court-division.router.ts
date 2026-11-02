import { CSV_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { fileBody } from '../../middlewares/fileBody.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import type { CaseRouterDeps } from './case.schema.js';
import * as courtDivisionController from './court-division.controller.js';
import {
  courtDivisionCitiesQuerySchema,
  courtDivisionIdParamSchema,
  createCourtDivisionSchema,
  listCourtDivisionsQuerySchema,
  updateCourtDivisionSchema,
} from './court-division.schema.js';

// Contact book of court divisions (VAR-01..02, AD-151). `/cities` and `/import` come before `/:id`.
export const createCourtDivisionRouter = (deps: CaseRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const byId = validParams(courtDivisionIdParamSchema);

  router.get(
    '/',
    ...guard,
    can('court_divisions', 'view'),
    validParsedQuery(listCourtDivisionsQuerySchema),
    courtDivisionController.listCourtDivisions,
  );
  router.get(
    '/cities',
    ...guard,
    can('court_divisions', 'view'),
    validParsedQuery(courtDivisionCitiesQuerySchema),
    courtDivisionController.listCities,
  );
  router.post(
    '/',
    ...guard,
    can('court_divisions', 'create'),
    validBody(createCourtDivisionSchema),
    courtDivisionController.createCourtDivision,
  );
  router.post(
    '/import',
    ...guard,
    can('court_divisions', 'create'),
    fileBody('text/csv', CSV_IMPORT_MAX_BYTES),
    courtDivisionController.importCsv,
  );
  router.patch(
    '/:id',
    ...guard,
    can('court_divisions', 'update'),
    byId,
    validBody(updateCourtDivisionSchema),
    courtDivisionController.updateCourtDivision,
  );
  router.delete('/:id', ...guard, can('court_divisions', 'delete'), byId, courtDivisionController.deleteCourtDivision);
  return router;
};
