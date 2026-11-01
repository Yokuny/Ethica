import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { calendarFeedRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as compromissoController from './compromisso.controller.js';
import type { AgendaRouterDeps } from './compromisso.schema.js';
import {
  compromissoIdParamSchema,
  createCompromissoSchema,
  listCompromissosQuerySchema,
  upcomingCompromissosQuerySchema,
  updateCompromissoSchema,
} from './compromisso.schema.js';
import * as feedController from './feed.controller.js';
import { feedTokenParamSchema } from './feed.schema.js';

export const createAgendaRouter = (deps: AgendaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  // Feed iCal (PRZ-03): sem sessão — o token secreto do link é a credencial.
  router.get('/feed/:token.ics', calendarFeedRateLimit, validParams(feedTokenParamSchema), feedController.calendarFeed);
  router.post(
    '/',
    ...guard,
    can('agenda', 'create'),
    validBody(createCompromissoSchema),
    compromissoController.createCompromisso,
  );
  router.get(
    '/upcoming',
    ...guard,
    can('agenda', 'view'),
    validParsedQuery(upcomingCompromissosQuerySchema),
    compromissoController.listUpcoming,
  );
  router.get(
    '/',
    ...guard,
    can('agenda', 'view'),
    validParsedQuery(listCompromissosQuerySchema),
    compromissoController.listCompromissos,
  );
  router.patch(
    '/:id',
    ...guard,
    can('agenda', 'update'),
    validParams(compromissoIdParamSchema),
    validBody(updateCompromissoSchema),
    compromissoController.updateCompromisso,
  );
  router.delete(
    '/:id',
    ...guard,
    can('agenda', 'delete'),
    validParams(compromissoIdParamSchema),
    compromissoController.deleteCompromisso(deps.storage),
  );
  // Mapa de campo e aviso às partes (AD-131).
  router.post(
    '/:id/geocode',
    ...guard,
    can('agenda', 'update'),
    validParams(compromissoIdParamSchema),
    compromissoController.geocodificar(deps.geocoder),
  );
  router.post(
    '/:id/notice',
    ...guard,
    can('agenda', 'update'),
    validParams(compromissoIdParamSchema),
    compromissoController.enviarAviso(deps.mail),
  );

  return router;
};
