import { DISPLAY_TIMEZONE, type NotificationModule, type NotificationState } from '@ethica/contracts';
import type { NotificationDocument } from '@ethica/db';
import { dateInDisplayTz, Notification, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CreateNotification,
  DatedNotification,
  ListNotificationsQuery,
  NotificationRecord,
  NotificationWrite,
  SuggestionRecord,
} from './notification.schema.js';

const DATED = { $in: ['deadline' as const, 'alert' as const] };

// The day a notification is about (AD-282): the due date; the court movement of a suggestion; the day a notice was born.
const dayOf = (doc: NotificationDocument): string =>
  doc.dueDate ?? dateInDisplayTz(new Date(doc.evidence?.movement.at ?? doc.createdAt));

// Open while it asks for someone: pending, or a notice the person has not read (read is per person).
const toRecord = (doc: NotificationDocument, userId?: string): NotificationRecord => ({
  id: doc._id.toString(),
  kind: doc.kind,
  module: doc.module,
  source: doc.source,
  open:
    doc.kind === 'notice'
      ? !(doc.readBy ?? []).some((reader) => reader.toString() === userId)
      : doc.status === 'pending',
  date: dayOf(doc),
  status: doc.status,
  caseId: doc.Case?.toString(),
  title: doc.title,
  dueDate: doc.dueDate,
  filedDate: doc.filedDate,
  notes: doc.notes,
  topic: doc.topic,
  params: doc.params,
  severity: doc.severity,
  transactionId: doc.Transaction?.toString(),
  proposal: doc.proposal,
  evidence: doc.evidence,
  ruleKey: doc.ruleKey,
  rejectReason: doc.rejectReason,
  createdAt: doc.createdAt.toISOString(),
});

// A deadline or an alert (the model requires case, title, due date and status for both).
const toDated = (doc: NotificationDocument): DatedNotification => toRecord(doc) as DatedNotification;
const toSuggestion = (doc: NotificationDocument): SuggestionRecord => toRecord(doc) as SuggestionRecord;

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

const unread = (userId: string) => ({ kind: 'notice' as const, readBy: { $ne: toObjectId(userId) } });
const stateFilter = (state: NotificationState, userId: string) =>
  state === 'open'
    ? { $or: [{ status: 'pending' as const }, unread(userId)] }
    : { $nor: [{ status: 'pending' as const }, unread(userId)] };

// Every kind in one list (AD-282), only of the modules the person can see (D5). Open ones by their day, the oldest
// first (the overdue on top, the suggestions in the order of the court, AD-268); resolved ones the newest first.
export const list = async (
  tenantId: string,
  userId: string,
  modules: NotificationModule[],
  { page, limit, state, kind, caseId }: ListNotificationsQuery,
): Promise<{ items: NotificationRecord[]; total: number }> =>
  withDbTiming('notification.list', async () => {
    const situation = state ?? (caseId ? undefined : 'open');
    const match = {
      Tenant: toObjectId(tenantId),
      module: { $in: modules },
      ...(kind ? { kind } : {}),
      ...(caseId ? { Case: toObjectId(caseId) } : {}),
      ...(situation ? stateFilter(situation, userId) : {}),
    };
    const movementOrBirth = { $ifNull: [{ $toDate: '$evidence.movement.at' }, '$createdAt'] };
    const day = { $dateToString: { format: '%Y-%m-%d', date: movementOrBirth, timezone: DISPLAY_TIMEZONE } };
    const direction = situation === 'resolved' ? -1 : 1;
    const [result] = await Notification.aggregate<{ items: NotificationDocument[]; total: { count: number }[] }>([
      { $match: match },
      { $addFields: { day: { $ifNull: ['$dueDate', day] } } },
      { $sort: { day: direction, _id: direction } },
      { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
    ]);
    return {
      items: (result?.items ?? []).map((doc) => toRecord(doc, userId)),
      total: result?.total[0]?.count ?? 0,
    };
  });

// The number of the menu (AD-282): open ones that already reached their day. Suggestions and notices are born on it.
export const countDue = async (
  tenantId: string,
  userId: string,
  modules: NotificationModule[],
  today: string,
): Promise<number> =>
  withDbTiming('notification.countDue', () =>
    Notification.countDocuments(
      tenantScoped({
        Tenant: tenantId,
        module: { $in: modules },
        $or: [
          { kind: DATED, status: 'pending' as const, dueDate: { $lte: today } },
          { kind: 'suggestion' as const, status: 'pending' as const },
          unread(userId),
        ],
      }),
    ),
  );

// Read is per person: marking it never changes it for the others.
export const markRead = async (
  tenantId: string,
  userId: string,
  modules: NotificationModule[],
  id?: string,
): Promise<{ matchedCount: number }> =>
  withDbTiming('notification.markRead', async () => {
    const filter = tenantScoped({
      Tenant: tenantId,
      kind: 'notice' as const,
      module: { $in: modules },
      ...(id ? { _id: id } : {}),
    });
    const result = await Notification.updateMany(filter, { $addToSet: { readBy: toObjectId(userId) } });
    return { matchedCount: result.matchedCount };
  });

export const findPendingSuggestion = async (tenantId: string, id: string) =>
  withDbTiming('notification.findPendingSuggestion', async () => {
    const doc = await Notification.findOne(
      tenantScoped({ Tenant: tenantId, _id: id, kind: 'suggestion' as const, status: 'pending' as const }),
    ).lean();
    return doc ? toSuggestion(doc) : null;
  });

// Conditional: only one decision wins (AD-268, invariant 4); null = it was not pending any more.
export const decideSuggestion = async (
  tenantId: string,
  id: string,
  decision: { status: 'accepted' | 'rejected' | 'superseded'; userId: string; rejectReason?: string },
) =>
  withDbTiming('notification.decideSuggestion', async () => {
    const doc = await Notification.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, kind: 'suggestion' as const, status: 'pending' as const }),
      {
        $set: {
          status: decision.status,
          decidedBy: decision.userId,
          decidedAt: new Date(),
          ...(decision.rejectReason ? { rejectReason: decision.rejectReason } : {}),
        },
      },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toSuggestion(doc) : null;
  });

// The service refused the change: the suggestion goes back to pending.
export const reopenSuggestion = async (tenantId: string, id: string) =>
  withDbTiming('notification.reopenSuggestion', async () => {
    await Notification.updateOne(
      tenantScoped({ Tenant: tenantId, _id: id, kind: 'suggestion' as const, status: 'accepted' as const }),
      { $set: { status: 'pending' }, $unset: { decidedBy: 1, decidedAt: 1 } },
    );
  });

// The follow-up of a case closed by agreement or dismissal (plan, section 4): cancel its pending deadlines.
export const createCancelSuggestion = async (
  tenantId: string,
  caseId: string,
  count: number,
  evidence: SuggestionRecord['evidence'],
) =>
  withDbTiming('notification.createCancelSuggestion', async () => {
    await Notification.updateOne(
      { Tenant: tenantId, dedupeKey: `suggestion:${caseId}:notifications_cancel` },
      {
        $setOnInsert: {
          Tenant: tenantId,
          Case: caseId,
          kind: 'suggestion',
          module: 'expert_cases',
          source: 'datajud',
          status: 'pending',
          severity: 'warning',
          proposal: { target: 'notifications_cancel', count },
          evidence,
          ruleKey: 'notifications_cancel',
          ruleVersion: 1,
          readBy: [],
        },
      },
      { upsert: true },
    );
  });

// A case closed by an accepted suggestion: its other pending status and phase suggestions are superseded (a
// payment may still come after it).
export const supersedeCaseSuggestions = async (tenantId: string, caseId: string) =>
  withDbTiming('notification.supersedeCaseSuggestions', async () => {
    await Notification.updateMany(
      tenantScoped({
        Tenant: tenantId,
        Case: caseId,
        kind: 'suggestion' as const,
        status: 'pending' as const,
        'proposal.target': { $in: ['case_status' as const, 'case_phase' as const] },
      }),
      { $set: { status: 'superseded' } },
    );
  });
