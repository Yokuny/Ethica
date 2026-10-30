import type { Model } from 'mongoose';
import { toObjectId } from './textSearch.js';

// Contagem por grupo de um tenant: `key` é uma expressão de agregação (ex.:
// '$status'). Documento sem valor entra no grupo `fallback`.
export const groupStats = async <T>(
  model: Model<T>,
  tenantId: string,
  key: string,
  fallback: string,
): Promise<{ total: number; groups: { key: string; count: number }[] }> => {
  const rows = await model.aggregate<{ _id: string; count: number }>([
    { $match: { Tenant: toObjectId(tenantId) } },
    { $group: { _id: { $ifNull: [key, fallback] }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const groups = rows.map((row) => ({ key: String(row._id), count: row.count }));
  return { total: groups.reduce((sum, group) => sum + group.count, 0), groups };
};
