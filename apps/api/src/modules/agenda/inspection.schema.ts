import type { InspectionData, MediaType, SaveInspection, UpdateMedia } from '@ethica/contracts';
import {
  APPOINTMENT_TYPES,
  calendarDateSchema,
  idSchema,
  MEDIA_TYPES,
  mediaIdSchema,
  saveInspectionSchema,
  updateMediaSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { AppointmentRecord } from './appointment.schema.js';

export type { InspectionData, SaveInspection, UpdateMedia };
export { saveInspectionSchema, updateMediaSchema };

export const inspectionParamSchema = z.object({ appointmentId: idSchema }).strict();
export const inspectionMediaParamSchema = z.object({ appointmentId: idSchema, mediaId: mediaIdSchema }).strict();
export const inspectionCaseParamSchema = z.object({ caseId: idSchema }).strict();
// Field route of a period (CAM-01, CPE-01): the day (`from` = `to`), the week, the month or the year, both ends
// included; `type` keeps only one kind of appointment (the period shows only the inspections).
const PERIOD_MAX_DAYS = 366;
export const inspectionPeriodQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema, type: z.enum(APPOINTMENT_TYPES).optional() })
  .strict()
  .refine(({ from, to }) => from <= to && (Date.parse(to) - Date.parse(from)) / 86_400_000 < PERIOD_MAX_DAYS, {
    message: 'período inválido',
    path: ['to'],
  });
export type InspectionPeriodQuery = z.infer<typeof inspectionPeriodQuerySchema>;
export const mediaUploadQuerySchema = z
  .object({ type: z.enum(MEDIA_TYPES), caption: z.string().trim().max(200).optional() })
  .strict();
export type MediaUploadQuery = z.infer<typeof mediaUploadQuerySchema>;

export type InspectionRouterDeps = { validToken: RequestHandler; storage?: FileStorage };

export type MediaRecord = {
  id: string;
  type: MediaType;
  bytes: number;
  mime: string;
  caption?: string;
  createdAt: Date;
};

// Inspection record (AD-130). With no saved record, `version` 0 and empty data.
export type InspectionRecord = {
  appointmentId: string;
  caseId?: string;
  version: number;
  data: InspectionData;
  media: MediaRecord[];
  updatedAt?: Date;
};

export type InspectionMediaWrite = MediaRecord & { key: string };

// Case summary in the field: number and parties by side.
export type FieldCase = { id: string; processNumber?: string; subject: string; plaintiff?: string; defendant?: string };

// One appointment of the day with what the phone needs without a connection (AD-128).
export type DayInspection = { appointment: AppointmentRecord; legalCase?: FieldCase; inspection: InspectionRecord };
