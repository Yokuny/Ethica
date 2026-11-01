import { Activity, type ActivityDocument, tenantScoped, toObjectId, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { ActivityRecord, ListActivityLogQuery, NewActivity } from './activityLog.schema.js';

const toRecord = (doc: ActivityDocument): ActivityRecord => ({
  id: doc._id.toString(),
  userId: doc.User.toString(),
  userName: doc.userName,
  module: doc.module,
  resource: doc.resource,
  action: doc.action,
  recordId: doc.recordId,
  label: doc.label,
  createdAt: doc.createdAt,
});

export const record = async ({ tenantId, userId, ...data }: NewActivity): Promise<void> =>
  withDbTiming('activityLog.record', async () => {
    const user = await User.findOne(tenantScoped({ Tenant: tenantId, _id: userId }))
      .select('name')
      .lean();
    if (!user) return;
    await Activity.create({ ...data, Tenant: tenantId, User: userId, userName: user.name });
  });

// Período em dias de calendário no fuso de exibição: limites como instantes (AD-036/AD-103).
export const listActivities = async (
  tenantId: string,
  query: ListActivityLogQuery,
  period: { from?: Date; to?: Date },
): Promise<{ items: ActivityRecord[]; total: number }> =>
  withDbTiming('activityLog.listActivities', async () => {
    const filter = tenantScoped({
      Tenant: tenantId,
      ...(query.userId ? { User: toObjectId(query.userId) } : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(period.from || period.to
        ? { createdAt: { ...(period.from ? { $gte: period.from } : {}), ...(period.to ? { $lt: period.to } : {}) } }
        : {}),
    });
    const [docs, total] = await Promise.all([
      Activity.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Activity.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

// As últimas exportações de dados do escritório (substitui `Tenant.dataExports`, AD-134).
export const latestExports = async (tenantId: string, limit: number): Promise<ActivityRecord[]> =>
  withDbTiming('activityLog.latestExports', async () => {
    const docs = await Activity.find(tenantScoped({ Tenant: tenantId, action: 'export' as const }))
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map(toRecord);
  });
