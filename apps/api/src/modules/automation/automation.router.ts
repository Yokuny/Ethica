import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validParams } from '../../middlewares/validation.middleware.js';
import * as automationController from './automation.controller.js';
import { type AutomationRouterDeps, automationCaseParamSchema } from './automation.schema.js';

// Automação Datajud (premium, AD-270): every route needs the module (403 `automation_required`).
export const createAutomationRouter = (deps: AutomationRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, automationController.requireAutomation];

  router.get(
    '/cases/:id/court-process',
    ...guard,
    can('expert_cases', 'view'),
    validParams(automationCaseParamSchema),
    automationController.getCaseCourtProcess,
  );
  return router;
};
