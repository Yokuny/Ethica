import { Router } from 'express';
import { isMember } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import * as preferencesController from './preferences.controller.js';
import { type PreferencesRouterDeps, updatePreferencesSchema } from './preferences.schema.js';

// Mounted on `/me` in the composition root.
export const createPreferencesRouter = (deps: PreferencesRouterDeps): Router => {
  const router = Router();
  router.get('/preferences', deps.validToken, tenantAssignmentCheck, isMember, preferencesController.getPreferences);
  router.patch(
    '/preferences',
    deps.validToken,
    tenantAssignmentCheck,
    isMember,
    validBody(updatePreferencesSchema),
    preferencesController.updatePreferences,
  );
  return router;
};
