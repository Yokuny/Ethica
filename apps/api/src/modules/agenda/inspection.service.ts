import { INSPECTION_EMPTY_DATA, INSPECTION_MEDIA_LIMITS, REPORT_IMG_SRC } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import * as caseService from '../case/case.service.js';
import * as officeService from '../identity/office.service.js';
import type { AppointmentRecord } from './appointment.schema.js';
import * as appointmentService from './appointment.service.js';
import * as inspectionRepository from './inspection.repository.js';
import type {
  DayInspection,
  FieldCase,
  InspectionRecord,
  MediaRecord,
  MediaUploadQuery,
  SaveInspection,
} from './inspection.schema.js';

// Another save got there first (AD-128): the controller returns 409 with the server version.
export class InspectionConflictError extends KeyedError {
  constructor(readonly current: InspectionRecord) {
    super('inspection_conflict');
  }
}

const empty = (appointment: AppointmentRecord): InspectionRecord => ({
  appointmentId: appointment.id,
  caseId: appointment.caseId,
  version: 0,
  data: INSPECTION_EMPTY_DATA,
  media: [],
});

const requireStorage = (storage: FileStorage | undefined): FileStorage => {
  if (!storage) throw new CustomError('storage_not_configured', 503);
  return storage;
};

const nextDay = (date: string): string => {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

const fieldCases = async (tenantId: string, ids: string[]): Promise<Map<string, FieldCase>> => {
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return new Map([...summaries].map(([id, summary]) => [id, { id, ...summary }]));
};

// CAM-01: everything of the day (by time) with each appointment's record, for the phone to keep.
export const listDay = async (tenantId: string, date: string): Promise<DayInspection[]> => {
  const appointments = await appointmentService.listAppointments(tenantId, { from: date, to: nextDay(date) });
  const [inspections, cases] = await Promise.all([
    inspectionRepository.findByAppointments(
      tenantId,
      appointments.map((appointment) => appointment.id),
    ),
    fieldCases(tenantId, [...new Set(appointments.flatMap((c) => (c.caseId ? [c.caseId] : [])))]),
  ]);
  return appointments.map((appointment) => {
    const legalCase = appointment.caseId ? cases.get(appointment.caseId) : undefined;
    return {
      appointment,
      ...(legalCase ? { legalCase } : {}),
      inspection: inspections.get(appointment.id) ?? empty(appointment),
    };
  });
};

export const getInspection = async (tenantId: string, appointmentId: string): Promise<DayInspection> => {
  const appointment = await appointmentService.getAppointment(tenantId, appointmentId);
  const [inspection, cases] = await Promise.all([
    inspectionRepository.findByAppointment(tenantId, appointmentId),
    fieldCases(tenantId, appointment.caseId ? [appointment.caseId] : []),
  ]);
  const legalCase = appointment.caseId ? cases.get(appointment.caseId) : undefined;
  return { appointment, ...(legalCase ? { legalCase } : {}), inspection: inspection ?? empty(appointment) };
};

// CAM-02 and CAM-05: saves the whole form only over the version the device knew.
export const saveInspection = async (
  tenantId: string,
  appointmentId: string,
  { version, data }: SaveInspection,
): Promise<InspectionRecord> => {
  const appointment = await appointmentService.getAppointment(tenantId, appointmentId);
  const saved = await inspectionRepository.save(tenantId, appointmentId, appointment.caseId, version, data);
  if (saved) return saved;
  throw new InspectionConflictError(
    (await inspectionRepository.findByAppointment(tenantId, appointmentId)) ?? empty(appointment),
  );
};

// CAM-03/06/07: file in storage with the quota reserved first (AD-120, AD-129). The same id
// again returns the media already saved (offline resend, AD-128).
export const uploadMedia = async (
  storage: FileStorage | undefined,
  tenantId: string,
  appointmentId: string,
  mediaId: string,
  { type, caption }: MediaUploadQuery,
  file: { body: Buffer; mime: string },
): Promise<MediaRecord> => {
  const files = requireStorage(storage);
  const limit = INSPECTION_MEDIA_LIMITS[type];
  if (!limit.mimes.includes(file.mime)) throw new CustomError('unsupported_file_type', 415, file.mime);
  if (file.body.length > limit.maxBytes) throw new CustomError('file_too_large', 413);
  const appointment = await appointmentService.getAppointment(tenantId, appointmentId);
  const current = await inspectionRepository.findByAppointment(tenantId, appointmentId);
  const existing = current?.media.find((media) => media.id === mediaId);
  if (existing) return existing;
  if ((current?.media.filter((media) => media.type === type).length ?? 0) >= limit.maxByInspection) {
    throw new CustomError('media_limit_reached', 422);
  }
  const media = {
    id: mediaId,
    type,
    key: `tenants/${tenantId}/inspections/${appointmentId}/${mediaId}`,
    bytes: file.body.length,
    mime: file.mime,
    ...(caption ? { caption } : {}),
    createdAt: new Date(),
  };
  await officeService.reserveFile(tenantId, media.bytes);
  try {
    await files.put(media.key, file.body, media.mime);
    if (!(await inspectionRepository.addMedia(tenantId, appointmentId, appointment.caseId, media))) {
      // Another upload of the same id won the race: the file is the same, only the reservation is left over.
      await officeService.returnFile(tenantId, media.bytes);
    }
  } catch (error) {
    await officeService.returnFile(tenantId, media.bytes);
    throw error;
  }
  const { key: _key, ...record } = media;
  return record;
};

export const getMedia = async (
  storage: FileStorage | undefined,
  tenantId: string,
  appointmentId: string,
  mediaId: string,
): Promise<{ body: Buffer; mime: string }> => {
  const media = await inspectionRepository.findMedia(tenantId, appointmentId, mediaId);
  const body = media && storage ? await storage.get(media.key) : null;
  if (!media || !body) throw new CustomError('not_found', 404);
  return { body, mime: media.mime };
};

// Report photo (AD-129): `src` stored in the HTML → bytes, only from the same tenant; `null` if it is gone.
export const readReportPhoto = async (
  storage: FileStorage | undefined,
  tenantId: string,
  src: string,
): Promise<{ body: Buffer; mime: string } | null> => {
  if (!REPORT_IMG_SRC.test(src)) return null;
  const [, , appointmentId, , mediaId] = src.split('/');
  return getMedia(storage, tenantId, appointmentId as string, mediaId as string).catch(() => null);
};

export const updateCaption = async (tenantId: string, appointmentId: string, mediaId: string, caption: string) => {
  if (!(await inspectionRepository.updateCaption(tenantId, appointmentId, mediaId, caption))) {
    throw new CustomError('not_found', 404);
  }
  return getInspection(tenantId, appointmentId);
};

// Deleting gives the quota back. A deleted signature leaves `signatureId` without a file: readers ignore it.
export const removeMedia = async (
  storage: FileStorage | undefined,
  tenantId: string,
  appointmentId: string,
  mediaId: string,
): Promise<void> => {
  const files = requireStorage(storage);
  const removida = await inspectionRepository.removeMedia(tenantId, appointmentId, mediaId);
  if (!removida) throw new CustomError('not_found', 404);
  await files.remove(removida.key);
  await officeService.returnFile(tenantId, removida.bytes);
};

// Records of the case (gallery and panel), each with its appointment.
export const listByCase = async (tenantId: string, caseId: string): Promise<DayInspection[]> => {
  const appointments = (await appointmentService.listByCase(tenantId, caseId)).reverse();
  const inspections = await inspectionRepository.findByAppointments(
    tenantId,
    appointments.map((appointment) => appointment.id),
  );
  return appointments.flatMap((appointment) => {
    const inspection = inspections.get(appointment.id);
    return inspection ? [{ appointment, inspection }] : [];
  });
};

// Report (AD-130): the most recent done inspection of the case that has a record.
export const lastDoneByCase = async (tenantId: string, caseId: string) =>
  (await listByCase(tenantId, caseId)).find(({ appointment }) => appointment.status === 'done');

// Deleting the appointment takes the record and the media, giving the quota back (AD-130).
export const removeAppointment = async (storage: FileStorage | undefined, tenantId: string, id: string) => {
  await appointmentService.deleteAppointment(tenantId, id);
  const media = await inspectionRepository.deleteByAppointment(tenantId, id);
  if (!media.length) return;
  await Promise.all(media.map((media) => storage?.remove(media.key)));
  await officeService.returnFile(
    tenantId,
    media.reduce((total, media) => total + media.bytes, 0),
  );
};
