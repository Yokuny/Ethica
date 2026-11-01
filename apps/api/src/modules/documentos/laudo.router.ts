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

// Laudos e modelos (LAU-01..03, 05, 06). Montado em `/expert-reports`; `/templates` vem antes de `/:id`.
export const createLaudoRouter = (deps: LaudoRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const providers = { pdf: deps.pdf, storage: deps.storage };
  const modelo = validParams(modeloIdParamSchema);
  const modeloSecao = validParams(modeloSecaoParamSchema);
  const laudo = validParams(laudoIdParamSchema);
  const laudoSecao = validParams(laudoSecaoParamSchema);

  router.get(
    '/templates',
    ...guard,
    can('report_templates', 'view'),
    validParsedQuery(listModelosQuerySchema),
    laudoController.listModelos,
  );
  router.post(
    '/templates',
    ...guard,
    can('report_templates', 'create'),
    validBody(createModeloLaudoSchema),
    laudoController.createModelo,
  );
  router.get('/templates/:id', ...guard, can('report_templates', 'view'), modelo, laudoController.getModelo);
  router.patch(
    '/templates/:id',
    ...guard,
    can('report_templates', 'update'),
    modelo,
    validBody(updateModeloLaudoSchema),
    laudoController.renameModelo,
  );
  router.delete('/templates/:id', ...guard, can('report_templates', 'delete'), modelo, laudoController.deleteModelo);
  router.post(
    '/templates/:id/sections',
    ...guard,
    can('report_templates', 'update'),
    modelo,
    validBody(modeloSecaoSchema),
    laudoController.addModeloSecao,
  );
  router.put(
    '/templates/:id/sections/:secaoId',
    ...guard,
    can('report_templates', 'update'),
    modeloSecao,
    validBody(modeloSecaoSchema),
    laudoController.updateModeloSecao,
  );
  router.delete(
    '/templates/:id/sections/:secaoId',
    ...guard,
    can('report_templates', 'update'),
    modeloSecao,
    laudoController.removeModeloSecao,
  );
  router.post(
    '/templates/:id/sections/:secaoId/move',
    ...guard,
    can('report_templates', 'update'),
    modeloSecao,
    validBody(moverSecaoSchema),
    laudoController.moverModeloSecao,
  );

  router.get(
    '/',
    ...guard,
    can('expert_reports', 'view'),
    validParsedQuery(listLaudosQuerySchema),
    laudoController.listLaudos,
  );
  router.post(
    '/',
    ...guard,
    can('expert_reports', 'create'),
    validBody(createLaudoSchema),
    laudoController.createLaudo(providers),
  );
  router.get('/:id', ...guard, can('expert_reports', 'view'), laudo, laudoController.getLaudo);
  router.delete('/:id', ...guard, can('expert_reports', 'delete'), laudo, laudoController.deleteLaudo);
  router.patch(
    '/:id/sections/:secaoId',
    ...guard,
    can('expert_reports', 'update'),
    laudoSecao,
    validBody(updateLaudoSecaoSchema),
    laudoController.updateLaudoSecao,
  );
  router.delete(
    '/:id/sections/:secaoId',
    ...guard,
    can('expert_reports', 'update'),
    laudoSecao,
    laudoController.removeLaudoSecao,
  );
  router.post(
    '/:id/complete',
    ...guard,
    can('expert_reports', 'update'),
    laudo,
    validBody(concluirLaudoSchema),
    laudoController.concluirLaudo(providers),
  );
  router.get('/:id/pdf', ...guard, can('expert_reports', 'view'), laudo, laudoController.laudoPdf(providers));
  router.get('/:id/docx', ...guard, can('expert_reports', 'view'), laudo, laudoController.laudoDocx(providers));
  return router;
};
