import type { InspectionData } from '@ethica/contracts';
import { INSPECTION_EMPTY_DATA } from '@ethica/contracts';
import type { InspectionDocument } from '@ethica/db';
import { Inspection, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { InspectionMediaWrite, InspectionRecord, MediaRecord } from './inspection.schema.js';

const mediaToRecord = ({ key: _key, ...media }: InspectionMediaWrite): MediaRecord => media;

const toRecord = (doc: InspectionDocument): InspectionRecord => ({
  appointmentId: doc.Appointment.toString(),
  caseId: doc.Case?.toString(),
  version: doc.version,
  data: doc.data,
  media: doc.media.map(mediaToRecord),
  updatedAt: doc.updatedAt,
});

const ofAppointment = (tenantId: string, appointmentId: string) =>
  tenantScoped({ Tenant: tenantId, Appointment: appointmentId });

export const findByAppointment = async (tenantId: string, appointmentId: string): Promise<InspectionRecord | null> =>
  withDbTiming('inspection.findByAppointment', async () => {
    const doc = await Inspection.findOne(ofAppointment(tenantId, appointmentId)).lean();
    return doc ? toRecord(doc) : null;
  });

export const findByAppointments = async (tenantId: string, ids: string[]): Promise<Map<string, InspectionRecord>> =>
  withDbTiming('inspection.findByAppointments', async () => {
    if (!ids.length) return new Map();
    const docs = await Inspection.find(tenantScoped({ Tenant: tenantId, Appointment: { $in: ids } })).lean();
    return new Map(docs.map((doc) => [doc.Appointment.toString(), toRecord(doc)]));
  });

export const listByCase = async (tenantId: string, caseId: string): Promise<InspectionRecord[]> =>
  withDbTiming('inspection.listByCase', async () => {
    const docs = await Inspection.find(tenantScoped({ Tenant: tenantId, Case: caseId }))
      .sort({ updatedAt: -1 })
      .lean();
    return docs.map(toRecord);
  });

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Saves the form only if the server version is the one the device knew (AD-128).
// `version` 0 creates the record; `null`: another save got there first (conflict).
export const save = async (
  tenantId: string,
  appointmentId: string,
  caseId: string | undefined,
  version: number,
  data: InspectionData,
): Promise<InspectionRecord | null> =>
  withDbTiming('inspection.save', async () => {
    try {
      const doc = await Inspection.findOneAndUpdate(
        { ...ofAppointment(tenantId, appointmentId), version },
        {
          $set: { data, ...(caseId ? { Case: caseId } : {}) },
          $inc: { version: 1 },
          $setOnInsert: { media: [] },
        },
        { upsert: version === 0, returnDocument: 'after', runValidators: true },
      ).lean();
      return doc ? toRecord(doc) : null;
    } catch (error) {
      if (isDuplicateKeyError(error)) return null;
      throw error;
    }
  });

// Media can arrive before the form (offline): the record starts empty, at version 0.
export const addMedia = async (
  tenantId: string,
  appointmentId: string,
  caseId: string | undefined,
  media: InspectionMediaWrite,
): Promise<boolean> =>
  withDbTiming('inspection.addMedia', async () => {
    await Inspection.updateOne(
      ofAppointment(tenantId, appointmentId),
      {
        $setOnInsert: {
          version: 0,
          data: INSPECTION_EMPTY_DATA,
          ...(caseId ? { Case: toObjectId(caseId) } : {}),
        },
      },
      { upsert: true },
    ).catch((error: unknown) => {
      if (!isDuplicateKeyError(error)) throw error;
    });
    const result = await Inspection.updateOne(
      { ...ofAppointment(tenantId, appointmentId), 'media.id': { $ne: media.id } },
      { $push: { media: media } },
    );
    return result.modifiedCount === 1;
  });

export const findMedia = async (
  tenantId: string,
  appointmentId: string,
  mediaId: string,
): Promise<InspectionMediaWrite | null> =>
  withDbTiming('inspection.findMedia', async () => {
    const doc = await Inspection.findOne(ofAppointment(tenantId, appointmentId), {
      media: { $elemMatch: { id: mediaId } },
    }).lean();
    return doc?.media?.[0] ?? null;
  });

export const updateCaption = async (
  tenantId: string,
  appointmentId: string,
  mediaId: string,
  caption: string,
): Promise<boolean> =>
  withDbTiming('inspection.updateCaption', async () => {
    const result = await Inspection.updateOne(
      { ...ofAppointment(tenantId, appointmentId), 'media.id': mediaId },
      { $set: { 'media.$.caption': caption } },
    );
    return result.matchedCount === 1;
  });

// Returns the removed media (to delete the file and give the quota back) or `null`.
export const removeMedia = async (
  tenantId: string,
  appointmentId: string,
  mediaId: string,
): Promise<InspectionMediaWrite | null> =>
  withDbTiming('inspection.removeMedia', async () => {
    const before = await Inspection.findOneAndUpdate(
      { ...ofAppointment(tenantId, appointmentId), 'media.id': mediaId },
      { $pull: { media: { id: mediaId } } },
      { returnDocument: 'before', projection: { media: { $elemMatch: { id: mediaId } } } },
    ).lean();
    return before?.media?.[0] ?? null;
  });

// A deleted appointment takes the record with it (AD-130); returns the media so the files are deleted.
export const deleteByAppointment = async (tenantId: string, appointmentId: string): Promise<InspectionMediaWrite[]> =>
  withDbTiming('inspection.deleteByAppointment', async () => {
    const doc = await Inspection.findOneAndDelete(ofAppointment(tenantId, appointmentId)).lean();
    return doc?.media ?? [];
  });
