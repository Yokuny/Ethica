import type { ListStats } from '@ethica/contracts';
import type { PericiaDocument } from '@ethica/db';
import {
  dailyTrend,
  dateInDisplayTz,
  groupStats,
  Pericia,
  Prazo,
  periciaSearchStages,
  tenantScoped,
  toObjectId,
  withSearch,
} from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CreatePericiaInput,
  ListPericiasQuery,
  PericiaDistribution,
  PericiaRecord,
  PericiaResumo,
  UpdatePericia,
} from './pericia.schema.js';

const toRecord = (doc: PericiaDocument): PericiaRecord => ({
  id: doc._id.toString(),
  numeroProcesso: doc.numeroProcesso,
  justica: doc.justica,
  papel: doc.papel,
  tribunal: doc.tribunal,
  vara: doc.vara,
  comarca: doc.comarca,
  objeto: doc.objeto,
  autor: doc.autor,
  reu: doc.reu,
  status: doc.status,
  dataNomeacao: doc.dataNomeacao,
  honorariosPropostosCents: doc.honorariosPropostosCents,
  honorariosFixadosCents: doc.honorariosFixadosCents,
  observacoes: doc.observacoes,
  oportunidadeId: doc.Oportunidade?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

// Etapas em que a perícia ainda tem trabalho do perito pela frente.
const ABERTAS = ['appointed', 'accepted', 'inspection', 'drafting_report', 'clarifications'];

export const createPericia = async ({
  tenant,
  oportunidadeId,
  ...data
}: Omit<CreatePericiaInput, 'prazoLaudo'>): Promise<PericiaRecord> =>
  withDbTiming('pericia.createPericia', async () => {
    const doc = await Pericia.create({ ...data, Tenant: tenant, Oportunidade: oportunidadeId });
    return toRecord(doc);
  });

// Toda rota por :id passa por aqui: o filtro carrega o Tenant, então o id de
// outro tenant simplesmente não existe (AD-010).
export const findById = async (tenantId: string, id: string): Promise<PericiaRecord | null> =>
  withDbTiming('pericia.findById', async () => {
    const doc = await Pericia.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// Só os campos informados entram no $set — um campo omitido nunca vira undefined.
export const updatePericia = async (tenantId: string, id: string, data: UpdatePericia): Promise<PericiaRecord | null> =>
  withDbTiming('pericia.updatePericia', async () => {
    const update = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const doc = await Pericia.findOneAndUpdate(tenantScoped({ Tenant: tenantId, _id: id }), update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    return doc ? toRecord(doc) : null;
  });

export const deletePericia = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('pericia.deletePericia', async () => {
    const result = await Pericia.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const listPericias = async (
  tenantId: string,
  query: ListPericiasQuery,
): Promise<{ items: PericiaRecord[]; total: number }> =>
  withDbTiming('pericia.listPericias', async () => {
    const filters = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.justica ? { justica: query.justica } : {}),
    };
    const skip = (query.page - 1) * query.limit;

    // Busca de texto no Atlas Search (AD-054): trechos de palavras, sem acento, nunca regex.
    if (query.q) {
      const [result] = await withSearch(() =>
        Pericia.aggregate<{ items: PericiaDocument[]; total: { n: number }[] }>([
          ...periciaSearchStages(tenantId, { q: query.q as string }),
          { $match: { Tenant: toObjectId(tenantId), ...filters } },
          {
            $facet: {
              items: [{ $sort: { createdAt: -1, _id: 1 } }, { $skip: skip }, { $limit: query.limit }],
              total: [{ $count: 'n' }],
            },
          },
        ]),
      );
      return { items: (result?.items ?? []).map(toRecord), total: result?.total[0]?.n ?? 0 };
    }

    const filter = tenantScoped({ Tenant: tenantId, ...filters });
    const [docs, total] = await Promise.all([
      Pericia.find(filter).sort({ createdAt: -1, _id: 1 }).skip(skip).limit(query.limit).lean(),
      Pericia.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

// Enriquecimento cross-módulo: uma consulta `$in` por lote, nunca uma por item.
export const findResumosByIds = async (tenantId: string, ids: string[]): Promise<Map<string, PericiaResumo>> =>
  withDbTiming('pericia.findResumosByIds', async () => {
    if (ids.length === 0) return new Map();
    const docs = await Pericia.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } }))
      .select('numeroProcesso autor reu')
      .lean();
    return new Map(
      docs.map((doc) => [doc._id.toString(), { numeroProcesso: doc.numeroProcesso, autor: doc.autor, reu: doc.reu }]),
    );
  });

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Faixa da listagem: abertas, prazos pendentes vencidos, prazos que vencem em breve
// (até `venceEmBreveDias`) e laudos entregues.
export const stats = async (tenantId: string, venceEmBreveDias: number, now: Date = new Date()): Promise<ListStats> =>
  withDbTiming('pericia.stats', async () => {
    const today = dateInDisplayTz(now);
    const count = (extra: object) => Pericia.countDocuments(tenantScoped({ Tenant: tenantId, ...extra }));
    const prazos = (vencimento: object) =>
      Prazo.countDocuments(tenantScoped({ Tenant: tenantId, status: 'pending' as const, vencimento }));
    const [total, abertas, vencidas, proximas, entregues, trend] = await Promise.all([
      count({}),
      count({ status: { $in: ABERTAS } }),
      prazos({ $lt: today }),
      prazos({ $gte: today, $lte: addDays(today, venceEmBreveDias) }),
      count({ status: { $in: ['report_delivered', 'completed'] } }),
      dailyTrend(Pericia, tenantId, 'createdAt'),
    ]);
    return {
      total,
      trend,
      groups: [
        { key: 'open', count: abertas },
        { key: 'overdue_deadlines', count: vencidas },
        { key: 'deadlines_due_soon', count: proximas },
        { key: 'reports_delivered', count: entregues },
      ],
    };
  });

export const distribution = async (tenantId: string): Promise<PericiaDistribution> =>
  withDbTiming('pericia.distribution', async () => {
    const [status, justica] = await Promise.all([
      groupStats(Pericia, tenantId, '$status', 'appointed'),
      groupStats(Pericia, tenantId, '$justica', 'civil'),
    ]);
    return { status: status.groups, justica: justica.groups };
  });
