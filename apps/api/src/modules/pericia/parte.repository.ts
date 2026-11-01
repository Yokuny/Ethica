import type { ParteDocument } from '@ethica/db';
import { Parte, parteSearchStages, tenantScoped, toObjectId, withSearch } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CreateParte, ListPartesQuery, ParteRecord, UpdateParte } from './parte.schema.js';

const toRecord = (doc: ParteDocument): ParteRecord => ({
  id: doc._id.toString(),
  tipo: doc.tipo,
  nome: doc.nome,
  documento: doc.documento,
  oab: doc.oab,
  email: doc.email,
  telefone: doc.telefone,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createParte = async (tenantId: string, data: CreateParte): Promise<ParteRecord> =>
  withDbTiming('parte.createParte', async () => toRecord(await Parte.create({ ...data, Tenant: tenantId })));

export const findById = async (tenantId: string, id: string): Promise<ParteRecord | null> =>
  withDbTiming('parte.findById', async () => {
    const doc = await Parte.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const findByIds = async (tenantId: string, ids: string[]): Promise<ParteRecord[]> =>
  withDbTiming('parte.findByIds', async () => {
    if (ids.length === 0) return [];
    const docs = await Parte.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } })).lean();
    return docs.map(toRecord);
  });

// Reaproveitamento (AD-115): o primeiro cadastro do tipo com o mesmo documento, OAB ou nome.
export const findOneBy = async (
  tenantId: string,
  filter: Pick<ParteRecord, 'tipo'> & Partial<Pick<ParteRecord, 'documento' | 'oab' | 'nome'>>,
): Promise<ParteRecord | null> =>
  withDbTiming('parte.findOneBy', async () => {
    const doc = await Parte.findOne(tenantScoped({ Tenant: tenantId, ...filter }))
      .sort({ createdAt: 1 })
      .lean();
    return doc ? toRecord(doc) : null;
  });

// Só os campos informados entram no $set — um campo omitido nunca vira undefined.
export const updateParte = async (tenantId: string, id: string, data: UpdateParte): Promise<ParteRecord | null> =>
  withDbTiming('parte.updateParte', async () => {
    const update = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const doc = await Parte.findOneAndUpdate(tenantScoped({ Tenant: tenantId, _id: id }), update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    return doc ? toRecord(doc) : null;
  });

export const listPartes = async (
  tenantId: string,
  query: ListPartesQuery,
): Promise<{ items: ParteRecord[]; total: number }> =>
  withDbTiming('parte.listPartes', async () => {
    const filters = query.tipo ? { tipo: query.tipo } : {};
    const skip = (query.page - 1) * query.limit;

    // Busca de texto no Atlas Search (AD-054), nunca regex.
    if (query.q) {
      const [result] = await withSearch(() =>
        Parte.aggregate<{ items: ParteDocument[]; total: { n: number }[] }>([
          ...parteSearchStages(tenantId, { q: query.q as string }),
          { $match: { Tenant: toObjectId(tenantId), ...filters } },
          {
            $facet: {
              items: [{ $sort: { nome: 1, _id: 1 } }, { $skip: skip }, { $limit: query.limit }],
              total: [{ $count: 'n' }],
            },
          },
        ]),
      );
      return { items: (result?.items ?? []).map(toRecord), total: result?.total[0]?.n ?? 0 };
    }

    const filter = tenantScoped({ Tenant: tenantId, ...filters });
    const [docs, total] = await Promise.all([
      Parte.find(filter).sort({ nome: 1, _id: 1 }).skip(skip).limit(query.limit).lean(),
      Parte.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

// Exportação de dados (DOC-04).
export const listAll = async (tenantId: string): Promise<ParteRecord[]> =>
  withDbTiming('parte.listAll', async () => {
    const docs = await Parte.find(tenantScoped({ Tenant: tenantId }))
      .sort({ nome: 1 })
      .lean();
    return docs.map(toRecord);
  });
