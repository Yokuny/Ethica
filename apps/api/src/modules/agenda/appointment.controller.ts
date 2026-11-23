import { hasPermission, respObj } from '@ethica/contracts';
import type { MailProvider } from '@ethica/mail';
import type { Request, Response } from 'express';
import type { FileStorage } from '../../providers/file-storage.js';
import type { Geocoder } from '../../providers/geocoder.js';
import type { ListAppointmentsQuery, UpcomingAppointmentsQuery } from './appointment.schema.js';
import * as appointmentService from './appointment.service.js';
import type { ListCalendarEntriesQuery } from './calendar-entry.schema.js';
import * as calendarEntryService from './calendar-entry.service.js';
import * as inspectionService from './inspection.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  const result = await appointmentService.createAppointment(tenantOf(req), req.body);
  res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
};

export const listAppointments = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListAppointmentsQuery;
  res.json(respObj({ data: await appointmentService.listAppointments(tenantOf(req), query) }));
};

// All-day entries sent by the other modules (AEV-03).
export const listCalendarEntries = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListCalendarEntriesQuery;
  const canSeeFinance = hasPermission(req.tenantUser.permissions, 'finance', 'view');
  res.json(respObj({ data: await calendarEntryService.listEntries(tenantOf(req), query, canSeeFinance) }));
};

export const listUpcoming = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as UpcomingAppointmentsQuery;
  res.json(respObj({ data: await appointmentService.listUpcoming(tenantOf(req), query) }));
};

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  const result = await appointmentService.updateAppointment(tenantOf(req), req.params.id as string, req.body);
  res.json(respObj({ data: result }));
};

// Deleting takes the inspection record and the media with it (AD-130).
export const deleteAppointment =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    await inspectionService.removeAppointment(storage, tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  };

export const geocode =
  (geocoder: Geocoder) =>
  async (req: Request, res: Response): Promise<void> => {
    res.json(respObj({ data: await appointmentService.geocode(geocoder, tenantOf(req), req.params.id as string) }));
  };

export const sendNotice =
  (mail: MailProvider) =>
  async (req: Request, res: Response): Promise<void> => {
    const ctx = { tenantId: tenantOf(req), userId: req.tenantUser.user };
    const data = await appointmentService.sendNotice(mail, ctx, req.params.id as string);
    res.json(respObj({ data, message: 'notice_sent' }));
  };
