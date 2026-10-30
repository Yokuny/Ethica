import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import * as preferencesController from './preferences.controller.js';
import { type PreferencesRouterDeps, updatePreferencesSchema } from './preferences.schema.js';

// Todo papel do tenant tem preferências; não há leitura de preferência alheia.
const canOperate = checkRole(['admin', 'manager', 'operator']);

// Montado em `/me` no composition root.
export const createPreferencesRouter = (deps: PreferencesRouterDeps): Router => {
  const router = Router();
  router.get('/preferences', deps.validToken, tenantAssignmentCheck, canOperate, preferencesController.getPreferences);
  router.patch(
    '/preferences',
    deps.validToken,
    tenantAssignmentCheck,
    canOperate,
    validBody(updatePreferencesSchema),
    preferencesController.updatePreferences,
  );
  return router;
};
