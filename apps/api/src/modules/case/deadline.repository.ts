import type { DeadlineDocument } from '@ethica/db';
import { Deadline, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CreateDeadline,
  DeadlineRecord,
  DeadlineWrite,
  ListDeadlinesQuery,
  NextDeadline,
  NoticeDeadline,
} from './deadline.schema.js';

const toRecord = (doc: DeadlineDocument): DeadlineRecord => ({
  id: doc._id.toString(),
  caseId: doc.Case.toString(),
  // Saved before the alerts (AD-189): a deadline.
  kind: doc.kind ?? 'deadline',
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

// Only the given fields go into $set; `filedDate: null` becomes $unset.
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
      // An alert with the same title is not filed (AD-189).
      tenantScoped({
        Tenant: tenantId,
        Case: caseId,
        title,
        status: 'pending' as const,
        kind: { $ne: 'alert' as const },
      }),
      { $set: { status: 'filed', filedDate } },
      { sort: { dueDate: 1, _id: 1 }, returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const findById = async (tenantId: string, id: string): Promise<DeadlineRecord | null> =>
  withDbTiming('deadline.findById', async () => {
    const doc = await Deadline.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// "Prazos e Alertas" (AD-189): the pending ones by criticality (the nearest due date first, the overdue on
// top); the resolved ones from the most recent.
export const listDeadlines = async (
  tenantId: string,
  query: ListDeadlinesQuery,
): Promise<{ items: DeadlineRecord[]; total: number }> =>
  withDbTiming('deadline.listDeadlines', async () => {
    const filter = tenantScoped({ Tenant: tenantId, status: query.status });
    const direction = query.status === 'pending' ? 1 : -1;
    const [docs, total] = await Promise.all([
      Deadline.find(filter)
        .sort({ dueDate: direction, _id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Deadline.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
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

// System query (daily reminder): deliberately without a Tenant filter — each
// item comes back with its own, and the service splits by tenant before sending.
export const listPendingInDays = async (days: string[]): Promise<NoticeDeadline[]> =>
  withDbTiming('deadline.listPendingInDays', async () => {
    const docs = await Deadline.find({ status: 'pending', dueDate: { $in: days } })
      .sort({ dueDate: 1, _id: 1 })
      .lean();
    return docs.map((doc) => ({ ...toRecord(doc), tenantId: doc.Tenant.toString() }));
  });

// Case listing: the nearest pending deadline of each one, in a single aggregation.
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

// Data export (DOC-04) and schedule: every deadline of the tenant, by due date.
export const listAll = async (tenantId: string): Promise<DeadlineRecord[]> =>
  withDbTiming('deadline.listAll', async () => {
    const docs = await Deadline.find(tenantScoped({ Tenant: tenantId }))
      .sort({ dueDate: 1 })
      .lean();
    return docs.map(toRecord);
  });

// Cases whose delivery deadline falls in the period (services filter, AD-177).
export const caseIdsDueBetween = async (
  tenantId: string,
  titles: string[],
  range: { from?: string; to?: string },
): Promise<string[]> =>
  withDbTiming('deadline.caseIdsDueBetween', async () => {
    const dueDate = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) };
    const ids = await Deadline.distinct('Case', tenantScoped({ Tenant: tenantId, title: { $in: titles }, dueDate }));
    return ids.map(String);
  });
