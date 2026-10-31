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
import type { PericiaParteWrite } from './parte.schema.js';
import type {
  ListPericiasQuery,
  PericiaCreateWrite,
  PericiaDistribution,
  PericiaRecord,
  PericiaResumo,
  PericiaUpdateWrite,
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
  partes: (doc.partes ?? []).map((parte) => ({
    parteId: parte.Parte.toString(),
    polo: parte.polo,
    tipo: parte.tipo,
    nome: parte.nome,
  })),
  status: doc.status,
  dataNomeacao: doc.dataNomeacao,
  honorariosPropostosCents: doc.honorariosPropostosCents,
  honorariosFixadosCents: doc.honorariosFixadosCents,
  observacoes: doc.observacoes,
  dataAutuacao: doc.dataAutuacao,
  dataAdmissao: doc.dataAdmissao,
  dataDemissao: doc.dataDemissao,
  funcaoReclamante: doc.funcaoReclamante,
  periodoImprescritoInicio: doc.periodoImprescritoInicio,
  periodoImprescritoFim: doc.periodoImprescritoFim,
  localPericia: doc.localPericia,
  oportunidadeId: doc.Oportunidade?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toPartesDocs = (partes: PericiaParteWrite[]) =>
  partes.map(({ parteId, ...parte }) => ({ ...parte, Parte: parteId }));

// Etapas em que a perícia ainda tem trabalho do perito pela frente.
const ABERTAS = ['appointed', 'accepted', 'inspection', 'drafting_report', 'clarifications'];

export const createPericia = async ({
  tenant,
  oportunidadeId,
  partes,
  ...data
}: PericiaCreateWrite): Promise<PericiaRecord> =>
  withDbTiming('pericia.createPericia', async () => {
    const doc = await Pericia.create({
      ...data,
      partes: toPartesDocs(partes),
      Tenant: tenant,
      Oportunidade: oportunidadeId,
    });
    return toRecord(doc);
  });

// Toda rota por :id passa por aqui: o filtro carrega o Tenant, então o id de
// outro tenant simplesmente não existe (AD-010).
export const findById = async (tenantId: string, id: string): Promise<PericiaRecord | null> =>
  withDbTiming('pericia.findById', async () => {
    const doc = await Pericia.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// Aviso de duplicado do PDF (IMP-01.3): o id da perícia com o mesmo número no tenant.
export const findIdByNumero = async (tenantId: string, numeroProcesso: string): Promise<string | undefined> =>
  withDbTiming('pericia.findIdByNumero', async () => {
    const doc = await Pericia.findOne(tenantScoped({ Tenant: tenantId, numeroProcesso }))
      .select('_id')
      .lean();
    return doc?._id.toString();
  });

// Só os campos informados entram no $set — um campo omitido nunca vira undefined.
export const updatePericia = async (
  tenantId: string,
  id: string,
  { partes, ...data }: PericiaUpdateWrite,
): Promise<PericiaRecord | null> =>
  withDbTiming('pericia.updatePericia', async () => {
    const update = {
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
      ...(partes ? { partes: toPartesDocs(partes) } : {}),
    };
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
      .select('numeroProcesso partes')
      .lean();
    const nomes = (partes: PericiaDocument['partes'], polo: string) =>
      (partes ?? [])
        .filter((parte) => parte.polo === polo && parte.tipo === 'party')
        .map((parte) => parte.nome)
        .join(', ') || undefined;
    return new Map(
      docs.map((doc) => [
        doc._id.toString(),
        {
          numeroProcesso: doc.numeroProcesso,
          autor: nomes(doc.partes, 'plaintiff'),
          reu: nomes(doc.partes, 'defendant'),
        },
      ]),
    );
  });

// Renomear a parte atualiza a cópia do nome em todas as perícias em que ela aparece (AD-117).
export const renomearParte = async (tenantId: string, parteId: string, nome: string): Promise<void> =>
  withDbTiming('pericia.renomearParte', async () => {
    await Pericia.updateMany(
      tenantScoped({ Tenant: tenantId, 'partes.Parte': toObjectId(parteId) }),
      { $set: { 'partes.$[p].nome': nome } },
      { arrayFilters: [{ 'p.Parte': toObjectId(parteId) }] },
    );
  });

// Perícias em que a parte aparece (IMP-03), da mais recente para a mais antiga.
export const listByParte = async (tenantId: string, parteId: string): Promise<PericiaRecord[]> =>
  withDbTiming('pericia.listByParte', async () => {
    const docs = await Pericia.find(tenantScoped({ Tenant: tenantId, 'partes.Parte': toObjectId(parteId) }))
      .sort({ createdAt: -1, _id: 1 })
      .limit(200)
      .lean();
    return docs.map(toRecord);
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
