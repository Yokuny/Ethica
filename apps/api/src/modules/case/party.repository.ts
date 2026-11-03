import { partyNameKey } from '@ethica/contracts';
import type { PartyDocument } from '@ethica/db';
import { Party, partySearchStages, tenantScoped, toObjectId, withSearch } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CreateParty, ListPartiesQuery, PartyRecord, UpdateParty } from './party.schema.js';

const toRecord = (doc: PartyDocument): PartyRecord => ({
  id: doc._id.toString(),
  type: doc.type,
  name: doc.name,
  document: doc.document,
  oab: doc.oab,
  crea: doc.crea,
  email: doc.email,
  phone: doc.phone,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createParty = async (tenantId: string, data: CreateParty): Promise<PartyRecord> =>
  withDbTiming('party.createParty', async () => toRecord(await Party.create({ ...data, Tenant: tenantId })));

export const findById = async (tenantId: string, id: string): Promise<PartyRecord | null> =>
  withDbTiming('party.findById', async () => {
    const doc = await Party.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const findByIds = async (tenantId: string, ids: string[]): Promise<PartyRecord[]> =>
  withDbTiming('party.findByIds', async () => {
    if (ids.length === 0) return [];
    const docs = await Party.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } })).lean();
    return docs.map(toRecord);
  });

// Reuse (AD-115): the first record of the type with the same document, OAB, CREA or name. The name
// compares without case or accent (PSV-05); a record saved before the key also matches by the exact name.
export const findOneBy = async (
  tenantId: string,
  filter: Pick<PartyRecord, 'type'> & Partial<Pick<PartyRecord, 'document' | 'oab' | 'crea' | 'name'>>,
): Promise<PartyRecord | null> =>
  withDbTiming('party.findOneBy', async () => {
    const { name, ...rest } = filter;
    const byName = name ? { $or: [{ nameKey: partyNameKey(name) }, { name }] } : {};
    const doc = await Party.findOne(tenantScoped({ Tenant: tenantId, ...rest, ...byName }))
      .sort({ createdAt: 1 })
      .lean();
    return doc ? toRecord(doc) : null;
  });

// Only the given fields go into $set — an omitted field never becomes undefined.
export const updateParty = async (tenantId: string, id: string, data: UpdateParty): Promise<PartyRecord | null> =>
  withDbTiming('party.updateParty', async () => {
    const update = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const doc = await Party.findOneAndUpdate(tenantScoped({ Tenant: tenantId, _id: id }), update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    return doc ? toRecord(doc) : null;
  });

export const listParties = async (
  tenantId: string,
  query: ListPartiesQuery,
): Promise<{ items: PartyRecord[]; total: number }> =>
  withDbTiming('party.listParties', async () => {
    const filters = query.type ? { type: query.type } : {};
    const skip = (query.page - 1) * query.limit;

    // Text search on Atlas Search (AD-054), never regex.
    if (query.q) {
      const [result] = await withSearch(() =>
        Party.aggregate<{ items: PartyDocument[]; total: { n: number }[] }>([
          ...partySearchStages(tenantId, { q: query.q as string }),
          { $match: { Tenant: toObjectId(tenantId), ...filters } },
          {
            $facet: {
              items: [{ $sort: { name: 1, _id: 1 } }, { $skip: skip }, { $limit: query.limit }],
              total: [{ $count: 'n' }],
            },
          },
        ]),
      );
      return { items: (result?.items ?? []).map(toRecord), total: result?.total[0]?.n ?? 0 };
    }

    const filter = tenantScoped({ Tenant: tenantId, ...filters });
    const [docs, total] = await Promise.all([
      Party.find(filter).sort({ name: 1, _id: 1 }).skip(skip).limit(query.limit).lean(),
      Party.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

// Every record of the tenant, oldest first: base of the duplicate merge (PSV-05).
export const listOldestFirst = async (tenantId: string): Promise<PartyRecord[]> =>
  withDbTiming('party.listOldestFirst', async () => {
    const docs = await Party.find(tenantScoped({ Tenant: tenantId }))
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    return docs.map(toRecord);
  });

export const deleteMany = async (tenantId: string, ids: string[]): Promise<void> =>
  withDbTiming('party.deleteMany', async () => {
    if (ids.length) await Party.deleteMany(tenantScoped({ Tenant: tenantId, _id: { $in: ids } }));
  });

// Data export (DOC-04).
export const listAll = async (tenantId: string): Promise<PartyRecord[]> =>
  withDbTiming('party.listAll', async () => {
    const docs = await Party.find(tenantScoped({ Tenant: tenantId }))
      .sort({ name: 1 })
      .lean();
    return docs.map(toRecord);
  });
