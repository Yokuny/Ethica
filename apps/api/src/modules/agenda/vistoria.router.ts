import { VISTORIA_MIDIA_LIMITES } from '@ethica/contracts';
import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
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

const canOperate = checkRole(['admin', 'manager', 'operator']);
const MIMES = Object.values(VISTORIA_MIDIA_LIMITES).flatMap((limite) => limite.mimes);
const MAIOR = Math.max(...Object.values(VISTORIA_MIDIA_LIMITES).map((limite) => limite.maxBytes));

// Campo (CAM-01..07): registro de vistoria e mídias, qualquer papel do tenant (AD-107).
// Montado em `/vistorias`; `/dia` e `/pericia` vêm antes de `/:compromissoId`.
export const createVistoriaRouter = (deps: VistoriaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, canOperate];
  const midia = validParams(vistoriaMidiaParamSchema);

  router.get('/dia', ...guard, validParsedQuery(vistoriaDiaQuerySchema), vistoriaController.listDia);
  router.get(
    '/pericia/:periciaId',
    ...guard,
    validParams(vistoriaPericiaParamSchema),
    vistoriaController.listDaPericia,
  );
  router.get('/:compromissoId', ...guard, validParams(vistoriaParamSchema), vistoriaController.getVistoria);
  router.put(
    '/:compromissoId',
    ...guard,
    validParams(vistoriaParamSchema),
    validBody(saveVistoriaSchema),
    vistoriaController.salvarVistoria,
  );
  router.put(
    '/:compromissoId/midias/:midiaId',
    ...guard,
    midia,
    validParsedQuery(midiaUploadQuerySchema),
    fileBody(MIMES, MAIOR),
    vistoriaController.uploadMidia(deps.storage),
  );
  router.get('/:compromissoId/midias/:midiaId', ...guard, midia, vistoriaController.getMidia(deps.storage));
  router.patch(
    '/:compromissoId/midias/:midiaId',
    ...guard,
    midia,
    validBody(updateMidiaSchema),
    vistoriaController.updateLegenda,
  );
  router.delete('/:compromissoId/midias/:midiaId', ...guard, midia, vistoriaController.removeMidia(deps.storage));
  return router;
};
