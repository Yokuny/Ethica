import type { InspectionData, MediaType, SaveInspection, UpdateMedia } from '@ethica/contracts';
import {
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
export const inspectionDayQuerySchema = z.object({ date: calendarDateSchema }).strict();
export type InspectionDayQuery = z.infer<typeof inspectionDayQuerySchema>;
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

// Registro de vistoria (AD-130). Sem registro gravado, `versao` 0 e dados vazios.
export type InspectionRecord = {
  appointmentId: string;
  caseId?: string;
  version: number;
  data: InspectionData;
  media: MediaRecord[];
  updatedAt?: Date;
};

export type InspectionMediaWrite = MediaRecord & { key: string };

// Resumo da perícia no campo: número e partes por polo.
export type FieldCase = { id: string; processNumber: string; plaintiff?: string; defendant?: string };

// Um compromisso do dia com o que o celular precisa sem conexão (AD-128).
export type DayInspection = { appointment: AppointmentRecord; legalCase?: FieldCase; inspection: InspectionRecord };
