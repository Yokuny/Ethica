import { INSPECTION_MEDIA_LIMITS } from '@ethica/contracts';
import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { fileBody } from '../../middlewares/fileBody.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as inspectionController from './inspection.controller.js';
import {
  type InspectionRouterDeps,
  inspectionCaseParamSchema,
  inspectionDayQuerySchema,
  inspectionMediaParamSchema,
  inspectionParamSchema,
  mediaUploadQuerySchema,
  saveInspectionSchema,
  updateMediaSchema,
} from './inspection.schema.js';

const MIMES = Object.values(INSPECTION_MEDIA_LIMITS).flatMap((limit) => limit.mimes);
const GREATER = Math.max(...Object.values(INSPECTION_MEDIA_LIMITS).map((limit) => limit.maxBytes));

// Campo (CAM-01..07): registro de vistoria e mídias, permissão da agenda (AD-137).
// Montado em `/inspections`; `/day` e `/expert-case` vêm antes de `/:compromissoId`.
export const createInspectionRouter = (deps: InspectionRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const media = validParams(inspectionMediaParamSchema);

  router.get(
    '/day',
    ...guard,
    can('agenda', 'view'),
    validParsedQuery(inspectionDayQuerySchema),
    inspectionController.listDay,
  );
  router.get(
    '/expert-case/:caseId',
    ...guard,
    can('agenda', 'view'),
    validParams(inspectionCaseParamSchema),
    inspectionController.listByCase,
  );
  router.get(
    '/:appointmentId',
    ...guard,
    can('agenda', 'view'),
    validParams(inspectionParamSchema),
    inspectionController.getInspection,
  );
  router.put(
    '/:appointmentId',
    ...guard,
    can('agenda', 'update'),
    validParams(inspectionParamSchema),
    validBody(saveInspectionSchema),
    inspectionController.saveInspection,
  );
  router.put(
    '/:appointmentId/media/:mediaId',
    ...guard,
    can('agenda', 'update'),
    media,
    validParsedQuery(mediaUploadQuerySchema),
    fileBody(MIMES, GREATER),
    inspectionController.uploadMedia(deps.storage),
  );
  router.get(
    '/:appointmentId/media/:mediaId',
    ...guard,
    can('agenda', 'view'),
    media,
    inspectionController.getMedia(deps.storage),
  );
  router.patch(
    '/:appointmentId/media/:mediaId',
    ...guard,
    can('agenda', 'update'),
    media,
    validBody(updateMediaSchema),
    inspectionController.updateCaption,
  );
  router.delete(
    '/:appointmentId/media/:mediaId',
    ...guard,
    can('agenda', 'delete'),
    media,
    inspectionController.removeMedia(deps.storage),
  );
  return router;
};
