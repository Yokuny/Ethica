import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { calendarFeedRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as appointmentController from './appointment.controller.js';
import type { AgendaRouterDeps } from './appointment.schema.js';
import {
  appointmentIdParamSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  upcomingAppointmentsQuerySchema,
  updateAppointmentSchema,
} from './appointment.schema.js';
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
    validBody(createAppointmentSchema),
    appointmentController.createAppointment,
  );
  router.get(
    '/upcoming',
    ...guard,
    can('agenda', 'view'),
    validParsedQuery(upcomingAppointmentsQuerySchema),
    appointmentController.listUpcoming,
  );
  router.get(
    '/',
    ...guard,
    can('agenda', 'view'),
    validParsedQuery(listAppointmentsQuerySchema),
    appointmentController.listAppointments,
  );
  router.patch(
    '/:id',
    ...guard,
    can('agenda', 'update'),
    validParams(appointmentIdParamSchema),
    validBody(updateAppointmentSchema),
    appointmentController.updateAppointment,
  );
  router.delete(
    '/:id',
    ...guard,
    can('agenda', 'delete'),
    validParams(appointmentIdParamSchema),
    appointmentController.deleteAppointment(deps.storage),
  );
  // Mapa de campo e aviso às partes (AD-131).
  router.post(
    '/:id/geocode',
    ...guard,
    can('agenda', 'update'),
    validParams(appointmentIdParamSchema),
    appointmentController.geocode(deps.geocoder),
  );
  router.post(
    '/:id/notice',
    ...guard,
    can('agenda', 'update'),
    validParams(appointmentIdParamSchema),
    appointmentController.sendNotice(deps.mail),
  );

  return router;
};
