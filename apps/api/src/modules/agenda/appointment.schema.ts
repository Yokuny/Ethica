import type {
  AppointmentReason,
  AppointmentStatus,
  AppointmentType,
  CreateAppointment,
  UpdateAppointment,
} from '@ethica/contracts';
import {
  APPOINTMENT_TYPES,
  calendarDateSchema,
  createAppointmentSchema,
  idSchema,
  updateAppointmentSchema,
} from '@ethica/contracts';
import type { AppointmentOrigin } from '@ethica/db';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { Geocoder } from '../../providers/geocoder.js';
import type { MailProvider } from '../../providers/mail/index.js';

export type { CreateAppointment, UpdateAppointment };
export { createAppointmentSchema, updateAppointmentSchema };

export const MAX_RANGE_DAYS = 62;

export const appointmentIdParamSchema = z.object({ id: idSchema }).strict();

// [from, to) range in calendar dates of the display time zone; the agenda month
// view asks for at most 6 weeks.
export const listAppointmentsQuerySchema = z
  .object({
    from: calendarDateSchema,
    to: calendarDateSchema,
    type: z.enum(APPOINTMENT_TYPES).optional(),
    caseId: idSchema.optional(),
  })
  .strict()
  .refine((query) => query.from < query.to, { message: 'from precisa ser antes de to', path: ['to'] })
  .refine((query) => Date.parse(query.to) - Date.parse(query.from) <= MAX_RANGE_DAYS * 86_400_000, {
    message: `intervalo máximo de ${MAX_RANGE_DAYS} dias`,
    path: ['to'],
  });
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const upcomingAppointmentsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
    caseId: idSchema.optional(),
  })
  .strict();
export type UpcomingAppointmentsQuery = z.infer<typeof upcomingAppointmentsQuerySchema>;

export type AgendaRouterDeps = {
  validToken: RequestHandler;
  storage?: FileStorage;
  mail: MailProvider;
  geocoder: Geocoder;
};

export type AppointmentRecord = {
  id: string;
  type: AppointmentType;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  caseId?: string;
  // Enriched by the service with the process number; missing if the case no longer exists.
  caseNumber?: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  notes?: string;
  reason?: AppointmentReason;
  // Only when the geocoding is of the current address (AD-131).
  coordinates?: { lat: number; lng: number };
  notices: ScheduleNoticeRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduleNoticeRecord = { userId: string; at: Date; recipients: string[] };

export type AppointmentWrite = {
  type?: AppointmentType;
  title?: string;
  start?: Date;
  end?: Date;
  location?: string;
  caseId?: string;
  status?: AppointmentStatus;
  origin?: AppointmentOrigin;
  notes?: string;
  // `null` clears it: the appointment is no longer canceled.
  reason?: AppointmentReason | null;
};
