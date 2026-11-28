import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenant-assign.middleware.js';
import { validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as automationController from './automation.controller.js';
import { type AutomationRouterDeps, automationCaseParamSchema, courtLookupQuerySchema } from './automation.schema.js';

// Automação Datajud (premium, AD-270): every route needs the module (403 `automation_required`).
export const createAutomationRouter = (deps: AutomationRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, automationController.requireAutomation];

  router.get('/cases', ...guard, can('expert_cases', 'view'), automationController.listTrackedCases);
  router.get(
    '/cases/:id/court-process',
    ...guard,
    can('expert_cases', 'view'),
    validParams(automationCaseParamSchema),
    automationController.getCaseCourtProcess,
  );
  // Fill a case by its number, live (SGD-06): the same reading permission as the other automation routes.
  router.get(
    '/court-lookup',
    ...guard,
    can('expert_cases', 'view'),
    validParsedQuery(courtLookupQuerySchema),
    automationController.lookupCourtProcess(deps.datajud),
  );
  return router;
};
