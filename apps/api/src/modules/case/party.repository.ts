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

// Reaproveitamento (AD-115): o primeiro cadastro do tipo com o mesmo documento, OAB ou nome.
export const findOneBy = async (
  tenantId: string,
  filter: Pick<PartyRecord, 'type'> & Partial<Pick<PartyRecord, 'document' | 'oab' | 'name'>>,
): Promise<PartyRecord | null> =>
  withDbTiming('party.findOneBy', async () => {
    const doc = await Party.findOne(tenantScoped({ Tenant: tenantId, ...filter }))
      .sort({ createdAt: 1 })
      .lean();
    return doc ? toRecord(doc) : null;
  });

// Só os campos informados entram no $set — um campo omitido nunca vira undefined.
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

    // Busca de texto no Atlas Search (AD-054), nunca regex.
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

// Exportação de dados (DOC-04).
export const listAll = async (tenantId: string): Promise<PartyRecord[]> =>
  withDbTiming('party.listAll', async () => {
    const docs = await Party.find(tenantScoped({ Tenant: tenantId }))
      .sort({ name: 1 })
      .lean();
    return docs.map(toRecord);
  });
