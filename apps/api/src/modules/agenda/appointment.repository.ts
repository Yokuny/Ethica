import type { AppointmentType } from '@ethica/contracts';
import type { AppointmentDocument } from '@ethica/db';
import { Appointment, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { AppointmentRecord, AppointmentWrite } from './appointment.schema.js';

const toRecord = (doc: AppointmentDocument): AppointmentRecord => ({
  id: doc._id.toString(),
  tipo: doc.tipo,
  titulo: doc.titulo,
  inicio: doc.inicio,
  fim: doc.fim,
  local: doc.local,
  caseId: doc.Case?.toString(),
  status: doc.status,
  origin: doc.origin,
  observacoes: doc.observacoes,
  reason: doc.reason,
  ...(doc.coordinates && doc.coordinates.address === doc.local
    ? { coordinates: { lat: doc.coordinates.lat, lng: doc.coordinates.lng } }
    : {}),
  notices: (doc.notices ?? []).map((notice) => ({
    userId: notice.User.toString(),
    at: notice.at,
    recipients: notice.recipients,
  })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toDocumentFields = ({ caseId, reason, ...data }: AppointmentWrite) => {
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  if (caseId !== undefined) fields.Case = caseId;
  if (reason) fields.reason = reason;
  return fields;
};

export const createAppointment = async (tenantId: string, data: AppointmentWrite): Promise<AppointmentRecord> =>
  withDbTiming('agenda.createAppointment', async () => {
    const doc = await Appointment.create({ Tenant: tenantId, ...toDocumentFields(data) });
    return toRecord(doc);
  });

export const findById = async (tenantId: string, id: string): Promise<AppointmentRecord | null> =>
  withDbTiming('agenda.findById', async () => {
    const doc = await Appointment.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const updateAppointment = async (
  tenantId: string,
  id: string,
  data: AppointmentWrite,
): Promise<AppointmentRecord | null> =>
  withDbTiming('agenda.updateAppointment', async () => {
    const doc = await Appointment.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set: toDocumentFields(data), ...(data.reason === null ? { $unset: { reason: 1 } } : {}) },
      {
        returnDocument: 'after',
      },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteAppointment = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('agenda.deleteAppointment', async () => {
    const result = await Appointment.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

// Tudo que toca o intervalo: começa antes do fim e termina depois do início.
export const listInRange = async (
  tenantId: string,
  range: { from: Date; to: Date; tipo?: AppointmentType; caseId?: string },
): Promise<AppointmentRecord[]> =>
  withDbTiming('agenda.listInRange', async () => {
    const docs = await Appointment.find(
      tenantScoped({
        Tenant: tenantId,
        inicio: { $lt: range.to },
        fim: { $gt: range.from },
        ...(range.tipo ? { tipo: range.tipo } : {}),
        ...(range.caseId ? { Case: range.caseId } : {}),
      }),
    )
      .sort({ inicio: 1 })
      .limit(500)
      .lean();
    return docs.map(toRecord);
  });

export const listUpcoming = async (
  tenantId: string,
  options: { now: Date; limit: number; caseId?: string },
): Promise<AppointmentRecord[]> =>
  withDbTiming('agenda.listUpcoming', async () => {
    const docs = await Appointment.find(
      tenantScoped({
        Tenant: tenantId,
        status: 'scheduled' as const,
        fim: { $gte: options.now },
        ...(options.caseId ? { Case: options.caseId } : {}),
      }),
    )
      .sort({ inicio: 1 })
      .limit(options.limit)
      .lean();
    return docs.map(toRecord);
  });

// Ficha da perícia (com `periciaId`) e exportação de dados (DOC-02, DOC-04), por início.
export const listAll = async (tenantId: string, filter: { caseId?: string } = {}): Promise<AppointmentRecord[]> =>
  withDbTiming('appointment.listAll', async () => {
    const docs = await Appointment.find(
      tenantScoped({ Tenant: tenantId, ...(filter.caseId ? { Case: filter.caseId } : {}) }),
    )
      .sort({ inicio: 1 })
      .lean();
    return docs.map(toRecord);
  });

// Cache da geocodificação do endereço atual (AD-131).
export const setCoordinates = async (
  tenantId: string,
  id: string,
  coordinates: { lat: number; lng: number; address: string },
): Promise<AppointmentRecord | null> =>
  withDbTiming('agenda.setCoordinates', async () => {
    const doc = await Appointment.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set: { coordinates } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const addNotice = async (
  tenantId: string,
  id: string,
  notice: { userId: string; recipients: string[] },
): Promise<AppointmentRecord | null> =>
  withDbTiming('agenda.addNotice', async () => {
    const doc = await Appointment.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $push: { notices: { User: notice.userId, at: new Date(), recipients: notice.recipients } } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });
