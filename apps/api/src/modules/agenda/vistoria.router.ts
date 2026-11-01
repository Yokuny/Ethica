import { VISTORIA_MIDIA_LIMITES } from '@ethica/contracts';
import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { fileBody } from '../../middlewares/fileBody.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as vistoriaController from './vistoria.controller.js';
import {
  midiaUploadQuerySchema,
  saveVistoriaSchema,
  updateMidiaSchema,
  type VistoriaRouterDeps,
  vistoriaDiaQuerySchema,
  vistoriaMidiaParamSchema,
  vistoriaParamSchema,
  vistoriaPericiaParamSchema,
} from './vistoria.schema.js';

const MIMES = Object.values(VISTORIA_MIDIA_LIMITES).flatMap((limite) => limite.mimes);
const MAIOR = Math.max(...Object.values(VISTORIA_MIDIA_LIMITES).map((limite) => limite.maxBytes));

// Campo (CAM-01..07): registro de vistoria e mídias, permissão da agenda (AD-137).
// Montado em `/inspections`; `/day` e `/expert-case` vêm antes de `/:compromissoId`.
export const createVistoriaRouter = (deps: VistoriaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const midia = validParams(vistoriaMidiaParamSchema);

  router.get(
    '/day',
    ...guard,
    can('agenda', 'view'),
    validParsedQuery(vistoriaDiaQuerySchema),
    vistoriaController.listDia,
  );
  router.get(
    '/expert-case/:periciaId',
    ...guard,
    can('agenda', 'view'),
    validParams(vistoriaPericiaParamSchema),
    vistoriaController.listDaPericia,
  );
  router.get(
    '/:compromissoId',
    ...guard,
    can('agenda', 'view'),
    validParams(vistoriaParamSchema),
    vistoriaController.getVistoria,
  );
  router.put(
    '/:compromissoId',
    ...guard,
    can('agenda', 'update'),
    validParams(vistoriaParamSchema),
    validBody(saveVistoriaSchema),
    vistoriaController.salvarVistoria,
  );
  router.put(
    '/:compromissoId/media/:midiaId',
    ...guard,
    can('agenda', 'update'),
    midia,
    validParsedQuery(midiaUploadQuerySchema),
    fileBody(MIMES, MAIOR),
    vistoriaController.uploadMidia(deps.storage),
  );
  router.get(
    '/:compromissoId/media/:midiaId',
    ...guard,
    can('agenda', 'view'),
    midia,
    vistoriaController.getMidia(deps.storage),
  );
  router.patch(
    '/:compromissoId/media/:midiaId',
    ...guard,
    can('agenda', 'update'),
    midia,
    validBody(updateMidiaSchema),
    vistoriaController.updateLegenda,
  );
  router.delete(
    '/:compromissoId/media/:midiaId',
    ...guard,
    can('agenda', 'delete'),
    midia,
    vistoriaController.removeMidia(deps.storage),
  );
  return router;
};
