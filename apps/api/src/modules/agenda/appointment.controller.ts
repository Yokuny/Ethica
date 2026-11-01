import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { Geocoder } from '../../providers/geocoder.js';
import type { MailProvider } from '../../providers/mail/index.js';
import { CaseNotFoundError } from '../case/case.service.js';
import type { ListAppointmentsQuery, UpcomingAppointmentsQuery } from './appointment.schema.js';
import * as appointmentService from './appointment.service.js';
import { AppointmentNotFoundError } from './appointment.service.js';
import * as inspectionService from './inspection.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// Appointment or linked case missing (or from another tenant) -> 404.
const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof AppointmentNotFoundError || e instanceof CaseNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

export const createAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await appointmentService.createAppointment(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListAppointmentsQuery;
    res.json(respObj({ data: await appointmentService.listAppointments(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const listUpcoming = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as UpcomingAppointmentsQuery;
    res.json(respObj({ data: await appointmentService.listUpcoming(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const updateAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await appointmentService.updateAppointment(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

// Deleting takes the inspection record and the media with it (AD-130).
export const deleteAppointment =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await inspectionService.removeAppointment(storage, tenantOf(req), req.params.id as string);
      res.json(respObj({ message: 'removed_successfully' }));
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

export const geocode =
  (geocoder: Geocoder) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(respObj({ data: await appointmentService.geocode(geocoder, tenantOf(req), req.params.id as string) }));
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

export const sendNotice =
  (mail: MailProvider) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = { tenantId: tenantOf(req), userId: req.tenantUser.user };
      const data = await appointmentService.sendNotice(mail, ctx, req.params.id as string);
      res.json(respObj({ data, message: 'notice_sent' }));
    } catch (e) {
      notFoundAs404(e, next);
    }
  };
