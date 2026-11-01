import type { DeadlineDocument } from '@ethica/db';
import { Deadline, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CreateDeadline, DeadlineRecord, DeadlineWrite, NextDeadline, NoticeDeadline } from './deadline.schema.js';

const toRecord = (doc: DeadlineDocument): DeadlineRecord => ({
  id: doc._id.toString(),
  caseId: doc.Case.toString(),
  title: doc.title,
  dueDate: doc.dueDate,
  status: doc.status,
  filedDate: doc.filedDate,
  notes: doc.notes,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createDeadline = async (tenantId: string, caseId: string, data: CreateDeadline): Promise<DeadlineRecord> =>
  withDbTiming('deadline.createDeadline', async () => {
    const doc = await Deadline.create({ ...data, Tenant: tenantId, Case: caseId });
    return toRecord(doc);
  });

// Só os campos informados entram no $set; `protocoladoEm: null` vira $unset.
export const updateDeadline = async (
  tenantId: string,
  id: string,
  data: DeadlineWrite,
): Promise<DeadlineRecord | null> =>
  withDbTiming('deadline.updateDeadline', async () => {
    const { filedDate, ...rest } = data;
    const $set: Record<string, unknown> = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );
    if (filedDate) $set.filedDate = filedDate;
    const doc = await Deadline.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set, ...(filedDate === null ? { $unset: { filedDate: 1 } } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const filePending = async (
  tenantId: string,
  caseId: string,
  title: string,
  filedDate: string,
): Promise<DeadlineRecord | null> =>
  withDbTiming('deadline.filePending', async () => {
    const doc = await Deadline.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, Case: caseId, title, status: 'pending' as const }),
      { $set: { status: 'filed', filedDate } },
      { sort: { dueDate: 1, _id: 1 }, returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteDeadline = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('deadline.deleteDeadline', async () => {
    const result = await Deadline.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const deleteByCase = async (tenantId: string, caseId: string): Promise<void> =>
  withDbTiming('deadline.deleteByCase', async () => {
    await Deadline.deleteMany(tenantScoped({ Tenant: tenantId, Case: caseId }));
  });

export const listByCase = async (tenantId: string, caseId: string): Promise<DeadlineRecord[]> =>
  withDbTiming('deadline.listByCase', async () => {
    const docs = await Deadline.find(tenantScoped({ Tenant: tenantId, Case: caseId }))
      .sort({ dueDate: 1, _id: 1 })
      .lean();
    return docs.map(toRecord);
  });

export const listPending = async (tenantId: string, range: { from?: string; to?: string }): Promise<DeadlineRecord[]> =>
  withDbTiming('deadline.listPending', async () => {
    const dueDate = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lt: range.to } : {}) };
    const docs = await Deadline.find(
      tenantScoped({
        Tenant: tenantId,
        status: 'pending' as const,
        ...(Object.keys(dueDate).length ? { dueDate } : {}),
      }),
    )
      .sort({ dueDate: 1, _id: 1 })
      .limit(500)
      .lean();
    return docs.map(toRecord);
  });

// Consulta do sistema (aviso diário): de propósito sem filtro de Tenant — cada
// item volta com o seu, e o service separa por tenant antes de enviar.
export const listPendingInDays = async (days: string[]): Promise<NoticeDeadline[]> =>
  withDbTiming('deadline.listPendingInDays', async () => {
    const docs = await Deadline.find({ status: 'pending', dueDate: { $in: days } })
      .sort({ dueDate: 1, _id: 1 })
      .lean();
    return docs.map((doc) => ({ ...toRecord(doc), tenantId: doc.Tenant.toString() }));
  });

// Listagem de perícias: o prazo pendente mais próximo de cada uma, numa agregação só.
export const upcomingByCaseIds = async (tenantId: string, ids: string[]): Promise<Map<string, NextDeadline>> =>
  withDbTiming('deadline.upcomingByCaseIds', async () => {
    if (ids.length === 0) return new Map();
    const rows = await Deadline.aggregate<{ _id: unknown; title: string; dueDate: string }>([
      { $match: { Tenant: toObjectId(tenantId), status: 'pending', Case: { $in: ids.map(toObjectId) } } },
      { $sort: { dueDate: 1, _id: 1 } },
      { $group: { _id: '$Case', title: { $first: '$title' }, dueDate: { $first: '$dueDate' } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), { title: row.title, dueDate: row.dueDate }]));
  });

// Exportação de dados (DOC-04) e cronograma: todos os prazos do tenant, por vencimento.
export const listAll = async (tenantId: string): Promise<DeadlineRecord[]> =>
  withDbTiming('deadline.listAll', async () => {
    const docs = await Deadline.find(tenantScoped({ Tenant: tenantId }))
      .sort({ dueDate: 1 })
      .lean();
    return docs.map(toRecord);
  });
