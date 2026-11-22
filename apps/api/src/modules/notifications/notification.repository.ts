import type { NotificationModule } from '@ethica/contracts';
import type { NotificationDocument } from '@ethica/db';
import { Notification, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CreateNotification,
  DatedNotification,
  ListNoticesQuery,
  ListNotificationsQuery,
  NoticeRecord,
  NotificationRecord,
  NotificationWrite,
} from './notification.schema.js';

const DATED = { $in: ['deadline' as const, 'alert' as const] };

const toRecord = (doc: NotificationDocument): NotificationRecord => ({
  id: doc._id.toString(),
  kind: doc.kind,
  module: doc.module,
  source: doc.source,
  status: doc.status,
  caseId: doc.Case?.toString(),
  title: doc.title,
  dueDate: doc.dueDate,
  filedDate: doc.filedDate,
  notes: doc.notes,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

// A deadline or an alert (the model requires case, title, due date and status for both).
const toDated = (doc: NotificationDocument): DatedNotification => toRecord(doc) as DatedNotification;

// A deadline or an alert created by a person or by the system (the report delivery deadline, AD-264).
export const createDated = async (
  tenantId: string,
  { caseId, kind, ...data }: CreateNotification,
  source: 'user' | 'system',
): Promise<DatedNotification> =>
  withDbTiming('notification.createDated', async () => {
    const doc = await Notification.create({
      ...data,
      kind: kind ?? 'deadline',
      module: 'expert_cases',
      source,
      status: 'pending',
      Tenant: tenantId,
      Case: caseId,
    });
    return toDated(doc);
  });

// Only the given fields go into $set; `filedDate: null` becomes $unset.
export const updateDated = async (
  tenantId: string,
  id: string,
  data: NotificationWrite,
): Promise<DatedNotification | null> =>
  withDbTiming('notification.updateDated', async () => {
    const { filedDate, ...rest } = data;
    const $set: Record<string, unknown> = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );
    if (filedDate) $set.filedDate = filedDate;
    const doc = await Notification.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, kind: DATED }),
      { $set, ...(filedDate === null ? { $unset: { filedDate: 1 } } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toDated(doc) : null;
  });

// An alert with the same title is never filed (AD-189).
export const filePending = async (
  tenantId: string,
  caseId: string,
  title: string,
  filedDate: string,
): Promise<DatedNotification | null> =>
  withDbTiming('notification.filePending', async () => {
    const doc = await Notification.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, Case: caseId, kind: 'deadline' as const, title, status: 'pending' as const }),
      { $set: { status: 'filed', filedDate } },
      { sort: { dueDate: 1, _id: 1 }, returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toDated(doc) : null;
  });

export const findDatedById = async (tenantId: string, id: string): Promise<DatedNotification | null> =>
  withDbTiming('notification.findDatedById', async () => {
    const doc = await Notification.findOne(tenantScoped({ Tenant: tenantId, _id: id, kind: DATED })).lean();
    return doc ? toDated(doc) : null;
  });

// Central (AD-189, AD-263): pending ones by criticality (the nearest due date first, the overdue on top);
// resolved ones from the most recent. With `caseId` and no situation: every one of the case, by due date.
export const listDated = async (
  tenantId: string,
  { page, limit, status, caseId }: ListNotificationsQuery,
): Promise<{ items: DatedNotification[]; total: number }> =>
  withDbTiming('notification.listDated', async () => {
    const situation = status ?? (caseId ? undefined : 'pending');
    const filter = tenantScoped({
      Tenant: tenantId,
      kind: DATED,
      ...(situation ? { status: situation } : {}),
      ...(caseId ? { Case: caseId } : {}),
    });
    const direction = situation && situation !== 'pending' ? -1 : 1;
    const [docs, total] = await Promise.all([
      Notification.find(filter)
        .sort({ dueDate: direction, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);
    return { items: docs.map(toDated), total };
  });

export const deleteDated = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('notification.deleteDated', async () => {
    const result = await Notification.deleteOne(tenantScoped({ Tenant: tenantId, _id: id, kind: DATED }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const deleteByCase = async (tenantId: string, caseId: string): Promise<void> =>
  withDbTiming('notification.deleteByCase', async () => {
    await Notification.deleteMany(tenantScoped({ Tenant: tenantId, Case: caseId }));
  });

export const listByCase = async (tenantId: string, caseId: string): Promise<DatedNotification[]> =>
  withDbTiming('notification.listByCase', async () => {
    const docs = await Notification.find(tenantScoped({ Tenant: tenantId, Case: caseId, kind: DATED }))
      .sort({ dueDate: 1, _id: 1 })
      .lean();
    return docs.map(toDated);
  });

export const listPending = async (
  tenantId: string,
  range: { from?: string; to?: string },
): Promise<DatedNotification[]> =>
  withDbTiming('notification.listPending', async () => {
    const dueDate = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lt: range.to } : {}) };
    const docs = await Notification.find(
      tenantScoped({
        Tenant: tenantId,
        kind: DATED,
        status: 'pending' as const,
        ...(Object.keys(dueDate).length ? { dueDate } : {}),
      }),
    )
      .sort({ dueDate: 1, _id: 1 })
      .limit(500)
      .lean();
    return docs.map(toDated);
  });

// Data export (DOC-04): every deadline and alert of the tenant, by due date.
export const listAll = async (tenantId: string): Promise<DatedNotification[]> =>
  withDbTiming('notification.listAll', async () => {
    const docs = await Notification.find(tenantScoped({ Tenant: tenantId, kind: DATED }))
      .sort({ dueDate: 1 })
      .lean();
    return docs.map(toDated);
  });

// Notices of the modules the person can see (D5); `read` is per person (`readBy`).
const noticeFilter = (tenantId: string, modules: NotificationModule[]) =>
  tenantScoped({ Tenant: tenantId, kind: 'notice' as const, module: { $in: modules } });

export const listNotices = async (
  tenantId: string,
  userId: string,
  modules: NotificationModule[],
  { page, limit, unread }: ListNoticesQuery,
): Promise<{ items: NoticeRecord[]; total: number }> =>
  withDbTiming('notification.listNotices', async () => {
    const filter = {
      ...noticeFilter(tenantId, modules),
      ...(unread === 'true' ? { readBy: { $ne: toObjectId(userId) } } : {}),
    };
    const [docs, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);
    const items = docs.map((doc) => ({
      id: doc._id.toString(),
      module: doc.module,
      topic: doc.topic,
      params: doc.params,
      severity: doc.severity,
      caseId: doc.Case?.toString(),
      transactionId: doc.Transaction?.toString(),
      read: doc.readBy.some((reader) => reader.toString() === userId),
      createdAt: doc.createdAt,
    }));
    return { items, total };
  });

export const countUnread = async (tenantId: string, userId: string, modules: NotificationModule[]): Promise<number> =>
  withDbTiming('notification.countUnread', () =>
    Notification.countDocuments({ ...noticeFilter(tenantId, modules), readBy: { $ne: toObjectId(userId) } }),
  );

// Read is per person: marking it never changes it for the others.
export const markRead = async (
  tenantId: string,
  userId: string,
  modules: NotificationModule[],
  id?: string,
): Promise<{ matchedCount: number }> =>
  withDbTiming('notification.markRead', async () => {
    const filter = { ...noticeFilter(tenantId, modules), ...(id ? { _id: id } : {}) };
    const result = await Notification.updateMany(filter, { $addToSet: { readBy: toObjectId(userId) } });
    return { matchedCount: result.matchedCount };
  });
