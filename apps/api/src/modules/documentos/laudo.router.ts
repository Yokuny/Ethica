import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as laudoController from './laudo.controller.js';
import {
  concluirLaudoSchema,
  createLaudoSchema,
  createModeloLaudoSchema,
  type LaudoRouterDeps,
  laudoIdParamSchema,
  laudoSecaoParamSchema,
  listLaudosQuerySchema,
  listModelosQuerySchema,
  modeloIdParamSchema,
  modeloSecaoParamSchema,
  modeloSecaoSchema,
  moverSecaoSchema,
  updateLaudoSecaoSchema,
  updateModeloLaudoSchema,
} from './laudo.schema.js';

const canOperate = checkRole(['admin', 'manager', 'operator']);
// Modelo é padrão do escritório: só admin e manager editam (AD-126).
const canManage = checkRole(['admin', 'manager']);

// Laudos e modelos (LAU-01..03, 05, 06). Montado em `/laudos`; `/modelos` vem antes de `/:id`.
export const createLaudoRouter = (deps: LaudoRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const providers = { pdf: deps.pdf, storage: deps.storage };
  const modelo = validParams(modeloIdParamSchema);
  const modeloSecao = validParams(modeloSecaoParamSchema);
  const laudo = validParams(laudoIdParamSchema);
  const laudoSecao = validParams(laudoSecaoParamSchema);

  router.get('/modelos', ...guard, canOperate, validParsedQuery(listModelosQuerySchema), laudoController.listModelos);
  router.post('/modelos', ...guard, canManage, validBody(createModeloLaudoSchema), laudoController.createModelo);
  router.get('/modelos/:id', ...guard, canOperate, modelo, laudoController.getModelo);
  router.patch(
    '/modelos/:id',
    ...guard,
    canManage,
    modelo,
    validBody(updateModeloLaudoSchema),
    laudoController.renameModelo,
  );
  router.delete('/modelos/:id', ...guard, canManage, modelo, laudoController.deleteModelo);
  router.post(
    '/modelos/:id/secoes',
    ...guard,
    canManage,
    modelo,
    validBody(modeloSecaoSchema),
    laudoController.addModeloSecao,
  );
  router.put(
    '/modelos/:id/secoes/:secaoId',
    ...guard,
    canManage,
    modeloSecao,
    validBody(modeloSecaoSchema),
    laudoController.updateModeloSecao,
  );
  router.delete('/modelos/:id/secoes/:secaoId', ...guard, canManage, modeloSecao, laudoController.removeModeloSecao);
  router.post(
    '/modelos/:id/secoes/:secaoId/mover',
    ...guard,
    canManage,
    modeloSecao,
    validBody(moverSecaoSchema),
    laudoController.moverModeloSecao,
  );

  router.get('/', ...guard, canOperate, validParsedQuery(listLaudosQuerySchema), laudoController.listLaudos);
  router.post('/', ...guard, canOperate, validBody(createLaudoSchema), laudoController.createLaudo(providers));
  router.get('/:id', ...guard, canOperate, laudo, laudoController.getLaudo);
  router.delete('/:id', ...guard, canOperate, laudo, laudoController.deleteLaudo);
  router.patch(
    '/:id/secoes/:secaoId',
    ...guard,
    canOperate,
    laudoSecao,
    validBody(updateLaudoSecaoSchema),
    laudoController.updateLaudoSecao,
  );
  router.delete('/:id/secoes/:secaoId', ...guard, canOperate, laudoSecao, laudoController.removeLaudoSecao);
  router.post(
    '/:id/concluir',
    ...guard,
    canOperate,
    laudo,
    validBody(concluirLaudoSchema),
    laudoController.concluirLaudo(providers),
  );
  router.get('/:id/pdf', ...guard, canOperate, laudo, laudoController.laudoPdf(providers));
  router.get('/:id/docx', ...guard, canOperate, laudo, laudoController.laudoDocx(providers));
  return router;
};
