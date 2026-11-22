import { Notification } from './models/notification.model.js';
import { tenantScoped } from './tenantScoped.js';
import { toObjectId } from './textSearch.js';

// Read-only functions over `Notification` for whoever cannot depend on the `notifications` module
// (the `case` module and the worker, AD-265). No business rule and no write here.

const DATED = { $in: ['deadline' as const, 'alert' as const] };

// Case listing: the nearest pending deadline or alert of each case, in a single aggregation.
export const nextDueByCases = async (
  tenantId: string,
  caseIds: string[],
): Promise<Map<string, { title: string; dueDate: string }>> => {
  if (caseIds.length === 0) return new Map();
  const rows = await Notification.aggregate<{ _id: unknown; title: string; dueDate: string }>([
    {
      $match: { Tenant: toObjectId(tenantId), kind: DATED, status: 'pending', Case: { $in: caseIds.map(toObjectId) } },
    },
    { $sort: { dueDate: 1, _id: 1 } },
    { $group: { _id: '$Case', title: { $first: '$title' }, dueDate: { $first: '$dueDate' } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), { title: row.title, dueDate: row.dueDate }]));
};

// Cases whose delivery deadline (by title) falls in the period (services filter, AD-177).
export const caseIdsDueBetween = async (
  tenantId: string,
  titles: string[],
  range: { from?: string; to?: string },
): Promise<string[]> => {
  const dueDate = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) };
  const ids = await Notification.distinct(
    'Case',
    tenantScoped({ Tenant: tenantId, kind: 'deadline' as const, title: { $in: titles }, dueDate }),
  );
  return ids.map(String);
};

// Pending deadlines and alerts due before `today` (overdue) and from `today` to `until` (due soon).
export const pendingDueCounts = async (
  tenantId: string,
  today: string,
  until: string,
): Promise<{ overdue: number; dueSoon: number }> => {
  const count = (dueDate: object) =>
    Notification.countDocuments(tenantScoped({ Tenant: tenantId, kind: DATED, status: 'pending' as const, dueDate }));
  const [overdue, dueSoon] = await Promise.all([count({ $lt: today }), count({ $gte: today, $lte: until })]);
  return { overdue, dueSoon };
};
