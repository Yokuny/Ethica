import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import * as preferencesController from './preferences.controller.js';
import { type PreferencesRouterDeps, updatePreferencesSchema } from './preferences.schema.js';

// Every tenant role has preferences; there is no reading someone else's preference.
const canOperate = checkRole(['admin', 'manager', 'operator']);

// Mounted on `/me` in the composition root.
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
