import { TENANT_LOGO_MAX_BYTES } from '@ethica/contracts';
import { Router } from 'express';
import { isAdmin } from '../../middlewares/authorization.middleware.js';
import { fileBody } from '../../middlewares/fileBody.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody } from '../../middlewares/validation.middleware.js';
import * as officeController from './office.controller.js';
import { type OfficeRouterDeps, updateOfficeSchema, updateScheduleNoticeSchema } from './office.schema.js';

// Office identity on documents (DOC-01): admin configuration. Mounted on `/tenant/office`.
export const createOfficeRouter = (deps: OfficeRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, isAdmin];
  router.get('/', ...guard, officeController.getOffice);
  router.put('/', ...guard, validBody(updateOfficeSchema), officeController.updateOffice);
  router.get('/logo', ...guard, officeController.getLogo(deps.storage));
  router.post('/logo', ...guard, fileBody('image/png', TENANT_LOGO_MAX_BYTES), officeController.setLogo(deps.storage));
  router.delete('/logo', ...guard, officeController.removeLogo(deps.storage));
  // Template of the schedule notice to the parties (AD-131).
  router.get('/schedule-notice', ...guard, officeController.getScheduleNotice);
  router.put(
    '/schedule-notice',
    ...guard,
    validBody(updateScheduleNoticeSchema),
    officeController.updateScheduleNotice,
  );
  return router;
};
