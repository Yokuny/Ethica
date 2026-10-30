import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
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

const canOperate = checkRole(['admin', 'manager', 'operator']);

export const createAgendaRouter = (deps: AgendaRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, canOperate];

  router.post('/', ...guard, validBody(createCompromissoSchema), compromissoController.createCompromisso);
  router.get(
    '/upcoming',
    ...guard,
    validParsedQuery(upcomingCompromissosQuerySchema),
    compromissoController.listUpcoming,
  );
  router.get('/', ...guard, validParsedQuery(listCompromissosQuerySchema), compromissoController.listCompromissos);
  router.patch(
    '/:id',
    ...guard,
    validParams(compromissoIdParamSchema),
    validBody(updateCompromissoSchema),
    compromissoController.updateCompromisso,
  );
  router.delete('/:id', ...guard, validParams(compromissoIdParamSchema), compromissoController.deleteCompromisso);

  return router;
};
