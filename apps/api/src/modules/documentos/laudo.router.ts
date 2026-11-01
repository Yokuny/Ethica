import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
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

// Modelo é padrão do escritório: só admin e manager editam (AD-126).

// Laudos e modelos (LAU-01..03, 05, 06). Montado em `/laudos`; `/modelos` vem antes de `/:id`.
export const createLaudoRouter = (deps: LaudoRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const providers = { pdf: deps.pdf, storage: deps.storage };
  const modelo = validParams(modeloIdParamSchema);
  const modeloSecao = validParams(modeloSecaoParamSchema);
  const laudo = validParams(laudoIdParamSchema);
  const laudoSecao = validParams(laudoSecaoParamSchema);

  router.get(
    '/modelos',
    ...guard,
    can('modelos', 'view'),
    validParsedQuery(listModelosQuerySchema),
    laudoController.listModelos,
  );
  router.post(
    '/modelos',
    ...guard,
    can('modelos', 'create'),
    validBody(createModeloLaudoSchema),
    laudoController.createModelo,
  );
  router.get('/modelos/:id', ...guard, can('modelos', 'view'), modelo, laudoController.getModelo);
  router.patch(
    '/modelos/:id',
    ...guard,
    can('modelos', 'update'),
    modelo,
    validBody(updateModeloLaudoSchema),
    laudoController.renameModelo,
  );
  router.delete('/modelos/:id', ...guard, can('modelos', 'delete'), modelo, laudoController.deleteModelo);
  router.post(
    '/modelos/:id/secoes',
    ...guard,
    can('modelos', 'update'),
    modelo,
    validBody(modeloSecaoSchema),
    laudoController.addModeloSecao,
  );
  router.put(
    '/modelos/:id/secoes/:secaoId',
    ...guard,
    can('modelos', 'update'),
    modeloSecao,
    validBody(modeloSecaoSchema),
    laudoController.updateModeloSecao,
  );
  router.delete(
    '/modelos/:id/secoes/:secaoId',
    ...guard,
    can('modelos', 'update'),
    modeloSecao,
    laudoController.removeModeloSecao,
  );
  router.post(
    '/modelos/:id/secoes/:secaoId/mover',
    ...guard,
    can('modelos', 'update'),
    modeloSecao,
    validBody(moverSecaoSchema),
    laudoController.moverModeloSecao,
  );

  router.get('/', ...guard, can('laudos', 'view'), validParsedQuery(listLaudosQuerySchema), laudoController.listLaudos);
  router.post(
    '/',
    ...guard,
    can('laudos', 'create'),
    validBody(createLaudoSchema),
    laudoController.createLaudo(providers),
  );
  router.get('/:id', ...guard, can('laudos', 'view'), laudo, laudoController.getLaudo);
  router.delete('/:id', ...guard, can('laudos', 'delete'), laudo, laudoController.deleteLaudo);
  router.patch(
    '/:id/secoes/:secaoId',
    ...guard,
    can('laudos', 'update'),
    laudoSecao,
    validBody(updateLaudoSecaoSchema),
    laudoController.updateLaudoSecao,
  );
  router.delete(
    '/:id/secoes/:secaoId',
    ...guard,
    can('laudos', 'update'),
    laudoSecao,
    laudoController.removeLaudoSecao,
  );
  router.post(
    '/:id/concluir',
    ...guard,
    can('laudos', 'update'),
    laudo,
    validBody(concluirLaudoSchema),
    laudoController.concluirLaudo(providers),
  );
  router.get('/:id/pdf', ...guard, can('laudos', 'view'), laudo, laudoController.laudoPdf(providers));
  router.get('/:id/docx', ...guard, can('laudos', 'view'), laudo, laudoController.laudoDocx(providers));
  return router;
};
