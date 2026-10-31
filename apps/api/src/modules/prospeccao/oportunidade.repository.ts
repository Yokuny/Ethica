import type { ListStats, OportunidadeStatus } from '@ethica/contracts';
import type { OportunidadeDocument } from '@ethica/db';
import { dailyTrend, groupStats, Oportunidade, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CreateOportunidade,
  ListOportunidadesQuery,
  OportunidadeRecord,
  UpdateOportunidade,
} from './oportunidade.schema.js';

const toRecord = (doc: OportunidadeDocument): OportunidadeRecord => ({
  id: doc._id.toString(),
  numeroProcesso: doc.numeroProcesso,
  tribunal: doc.tribunal,
  classe: doc.classe,
  assuntos: doc.assuntos ?? [],
  orgaoJulgador: doc.orgaoJulgador,
  dataAjuizamento: doc.dataAjuizamento,
  ultimoMovimento: doc.ultimoMovimento,
  ultimoMovimentoEm: doc.ultimoMovimentoEm,
  status: doc.status,
  observacoes: doc.observacoes,
  periciaId: doc.Pericia?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createOportunidade = async (tenantId: string, data: CreateOportunidade): Promise<OportunidadeRecord> =>
  withDbTiming('prospeccao.createOportunidade', async () => {
    const doc = await Oportunidade.create({ Tenant: tenantId, ...data });
    return toRecord(doc);
  });

export const findById = async (tenantId: string, id: string): Promise<OportunidadeRecord | null> =>
  withDbTiming('prospeccao.findById', async () => {
    const doc = await Oportunidade.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// A guarda contra editar uma convertida é a própria query (status ≠ convertida).
export const updateOportunidade = async (
  tenantId: string,
  id: string,
  data: Omit<UpdateOportunidade, 'status'> & { status?: OportunidadeStatus; periciaId?: string },
): Promise<OportunidadeRecord | null> =>
  withDbTiming('prospeccao.updateOportunidade', async () => {
    const { periciaId, ...fields } = data;
    const update = {
      ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
      ...(periciaId ? { Pericia: periciaId } : {}),
    };
    const doc = await Oportunidade.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, status: { $ne: 'converted' as const } }),
      update,
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteOportunidade = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('prospeccao.deleteOportunidade', async () => {
    const result = await Oportunidade.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const listOportunidades = async (
  tenantId: string,
  query: ListOportunidadesQuery,
): Promise<{ items: OportunidadeRecord[]; total: number }> =>
  withDbTiming('prospeccao.listOportunidades', async () => {
    const filter = tenantScoped({ Tenant: tenantId, ...(query.status ? { status: query.status } : {}) });
    const [docs, total] = await Promise.all([
      Oportunidade.find(filter)
        .sort({ createdAt: -1, _id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Oportunidade.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

export const findIdsByNumeros = async (tenantId: string, numeros: string[]): Promise<Map<string, string>> =>
  withDbTiming('prospeccao.findIdsByNumeros', async () => {
    if (numeros.length === 0) return new Map();
    const docs = await Oportunidade.find(tenantScoped({ Tenant: tenantId, numeroProcesso: { $in: numeros } }))
      .select('numeroProcesso')
      .lean();
    return new Map(docs.map((doc) => [doc.numeroProcesso, doc._id.toString()]));
  });

export const stats = async (tenantId: string): Promise<ListStats> =>
  withDbTiming('prospeccao.stats', async () => {
    const [{ total, groups }, trend] = await Promise.all([
      groupStats(Oportunidade, tenantId, '$status', 'new'),
      dailyTrend(Oportunidade, tenantId, 'createdAt'),
    ]);
    return { total, trend, groups };
  });
