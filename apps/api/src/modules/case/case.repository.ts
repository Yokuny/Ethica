import type { CreateMovement, ListStats } from '@ethica/contracts';
import { CASE_CLOSED_STATUSES, CASE_PHASES_SUSPENSION, caseState, DISPLAY_TIMEZONE } from '@ethica/contracts';
import type { CaseDocument } from '@ethica/db';
import {
  Case,
  caseSearchStages,
  Deadline,
  dailyTrend,
  dateInDisplayTz,
  groupStats,
  newObjectId,
  tenantScoped,
  toObjectId,
  withSearch,
} from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CaseCreateWrite,
  CaseDistribution,
  CaseRecord,
  CaseSummary,
  CaseUpdateWrite,
  ListCasesQuery,
  StalledCase,
} from './case.schema.js';
import type { CasePartyWrite } from './party.schema.js';

const toRecord = (doc: CaseDocument): CaseRecord => ({
  id: doc._id.toString(),
  processNumber: doc.processNumber,
  courtType: doc.courtType,
  role: doc.role,
  court: doc.court,
  division: doc.division,
  district: doc.district,
  subject: doc.subject,
  parties: (doc.parties ?? []).map((party) => ({
    partyId: party.Party.toString(),
    side: party.side,
    tipo: party.tipo,
    nome: party.nome,
    ...(party.client ? { client: true } : {}),
  })),
  status: doc.status,
  phase: doc.phase,
  state: caseState(doc),
  nominationDate: doc.nominationDate,
  proposedFeesCents: doc.proposedFeesCents,
  fixedFeesCents: doc.fixedFeesCents,
  observacoes: doc.observacoes,
  docketingDate: doc.docketingDate,
  hireDate: doc.hireDate,
  terminationDate: doc.terminationDate,
  claimantJob: doc.claimantJob,
  nonPrescribedPeriodStart: doc.nonPrescribedPeriodStart,
  nonPrescribedPeriodEnd: doc.nonPrescribedPeriodEnd,
  location: doc.location,
  movements: [...(doc.movements ?? [])]
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((movement) => ({
      id: movement._id.toString(),
      tipo: movement.tipo,
      data: movement.data,
      observacoes: movement.observacoes,
    })),
  oportunidadeId: doc.Oportunidade?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toPartiesDocs = (parties: CasePartyWrite[]) =>
  parties.map(({ partyId, ...party }) => ({ ...party, Party: partyId }));

// Situação derivada (AD-133) como filtro do banco: a mesma regra de `situacaoDaPericia`.
const stateFilter = {
  closed: { status: { $in: CASE_CLOSED_STATUSES } },
  suspended: { status: { $nin: CASE_CLOSED_STATUSES }, phase: { $in: CASE_PHASES_SUSPENSION } },
  active: { status: { $nin: CASE_CLOSED_STATUSES }, phase: { $nin: CASE_PHASES_SUSPENSION } },
};

// Etapas em que a perícia ainda tem trabalho do perito pela frente.
const ABERTAS = ['appointed', 'accepted', 'inspection', 'drafting_report', 'clarifications'];

export const createCase = async ({ tenant, oportunidadeId, parties, ...data }: CaseCreateWrite): Promise<CaseRecord> =>
  withDbTiming('case.createCase', async () => {
    const doc = await Case.create({
      ...data,
      parties: toPartiesDocs(parties),
      Tenant: tenant,
      Oportunidade: oportunidadeId,
    });
    return toRecord(doc);
  });

// Toda rota por :id passa por aqui: o filtro carrega o Tenant, então o id de
// outro tenant simplesmente não existe (AD-010).
export const findById = async (tenantId: string, id: string): Promise<CaseRecord | null> =>
  withDbTiming('case.findById', async () => {
    const doc = await Case.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// Aviso de duplicado do PDF (IMP-01.3): o id da perícia com o mesmo número no tenant.
export const findIdByNumero = async (tenantId: string, processNumber: string): Promise<string | undefined> =>
  withDbTiming('case.findIdByNumero', async () => {
    const doc = await Case.findOne(tenantScoped({ Tenant: tenantId, processNumber }))
      .select('_id')
      .lean();
    return doc?._id.toString();
  });

// Só os campos informados entram no $set — um campo omitido nunca vira undefined.
export const updateCase = async (
  tenantId: string,
  id: string,
  { parties, ...data }: CaseUpdateWrite,
): Promise<CaseRecord | null> =>
  withDbTiming('case.updateCase', async () => {
    const { phase, ...rest } = data;
    const update = {
      ...Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined)),
      ...(parties ? { parties: toPartiesDocs(parties) } : {}),
      ...(phase ? { phase } : {}),
      ...(phase === null ? { $unset: { phase: 1 } } : {}),
    };
    const doc = await Case.findOneAndUpdate(tenantScoped({ Tenant: tenantId, _id: id }), update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    return doc ? toRecord(doc) : null;
  });

export const addMovement = async (tenantId: string, id: string, data: CreateMovement): Promise<CaseRecord | null> =>
  withDbTiming('case.addMovement', async () => {
    const doc = await Case.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $push: { movements: { _id: newObjectId(), ...data } } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// `null` quando a perícia ou a movimentação não existem.
export const removeMovement = async (tenantId: string, id: string, movementId: string): Promise<CaseRecord | null> =>
  withDbTiming('case.removeMovement', async () => {
    const oid = toObjectId(movementId);
    const doc = await Case.findOneAndUpdate(
      { ...tenantScoped({ Tenant: tenantId, _id: id }), 'movements._id': oid },
      { $pull: { movements: { _id: oid } } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Perícia parada (AD-121): não encerrada e com a referência (última movimentação, senão a
// nomeação, senão o dia do cadastro) antes de `limite`. Da mais antiga para a mais recente.
export const listStalled = async (tenantId: string, limite: string): Promise<Array<Omit<StalledCase, 'stalledDays'>>> =>
  withDbTiming('case.listStalled', async () => {
    const docs = await Case.aggregate<{
      _id: { toString(): string };
      processNumber: string;
      status: StalledCase['status'];
      court: string;
      division?: string;
      subject: string;
      ultima: string | null;
      nominationDate?: string;
      referencia: string;
    }>([
      // Suspensa (AD-133) não está parada: espera um fato fora do controle do perito.
      {
        $match: {
          Tenant: toObjectId(tenantId),
          status: { $nin: ['completed', 'declined'] },
          phase: { $nin: CASE_PHASES_SUSPENSION },
        },
      },
      { $addFields: { ultima: { $max: '$movements.data' } } },
      {
        $addFields: {
          referencia: {
            $ifNull: [
              '$ultima',
              '$nominationDate',
              { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: DISPLAY_TIMEZONE } },
            ],
          },
        },
      },
      { $match: { referencia: { $lt: limite } } },
      { $sort: { referencia: 1, processNumber: 1 } },
      {
        $project: {
          processNumber: 1,
          status: 1,
          court: 1,
          division: 1,
          subject: 1,
          ultima: 1,
          nominationDate: 1,
          referencia: 1,
        },
      },
    ]);
    return docs.map((doc) => ({
      id: doc._id.toString(),
      processNumber: doc.processNumber,
      status: doc.status,
      court: doc.court,
      division: doc.division,
      subject: doc.subject,
      referencia: doc.referencia,
      origin: doc.ultima ? 'movement' : doc.nominationDate ? 'appointment' : 'created',
    }));
  });

// Exportação de dados (DOC-04): todas as perícias do tenant.
export const listAll = async (tenantId: string): Promise<CaseRecord[]> =>
  withDbTiming('case.listAll', async () => {
    const docs = await Case.find(tenantScoped({ Tenant: tenantId }))
      .sort({ createdAt: 1 })
      .lean();
    return docs.map(toRecord);
  });

export const deleteCase = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('case.deleteCase', async () => {
    const result = await Case.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const listCases = async (
  tenantId: string,
  query: ListCasesQuery,
): Promise<{ items: CaseRecord[]; total: number }> =>
  withDbTiming('case.listCases', async () => {
    const filters = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.phase ? { phase: query.phase } : {}),
      ...(query.courtType ? { courtType: query.courtType } : {}),
      ...(query.state ? { $and: [stateFilter[query.state]] } : {}),
    };
    const skip = (query.page - 1) * query.limit;

    // Busca de texto no Atlas Search (AD-054): trechos de palavras, sem acento, nunca regex.
    if (query.q) {
      const [result] = await withSearch(() =>
        Case.aggregate<{ items: CaseDocument[]; total: { n: number }[] }>([
          ...caseSearchStages(tenantId, { q: query.q as string }),
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
      Case.find(filter).sort({ createdAt: -1, _id: 1 }).skip(skip).limit(query.limit).lean(),
      Case.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

// Enriquecimento cross-módulo: uma consulta `$in` por lote, nunca uma por item.
export const findSummariesByIds = async (tenantId: string, ids: string[]): Promise<Map<string, CaseSummary>> =>
  withDbTiming('case.findSummariesByIds', async () => {
    if (ids.length === 0) return new Map();
    const docs = await Case.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } }))
      .select('processNumber parties')
      .lean();
    const nomes = (parties: CaseDocument['parties'], side: string) =>
      (parties ?? [])
        .filter((party) => party.side === side && party.tipo === 'party')
        .map((party) => party.nome)
        .join(', ') || undefined;
    return new Map(
      docs.map((doc) => [
        doc._id.toString(),
        {
          processNumber: doc.processNumber,
          plaintiff: nomes(doc.parties, 'plaintiff'),
          defendant: nomes(doc.parties, 'defendant'),
          client: doc.parties?.find((party) => party.client)?.nome,
        },
      ]),
    );
  });

// Renomear a parte atualiza a cópia do nome em todas as perícias em que ela aparece (AD-117).
export const renameParty = async (tenantId: string, partyId: string, nome: string): Promise<void> =>
  withDbTiming('case.renameParty', async () => {
    await Case.updateMany(
      tenantScoped({ Tenant: tenantId, 'parties.Party': toObjectId(partyId) }),
      { $set: { 'parties.$[p].nome': nome } },
      { arrayFilters: [{ 'p.Party': toObjectId(partyId) }] },
    );
  });

// Perícias em que a parte aparece (IMP-03), da mais recente para a mais antiga.
export const listByParty = async (tenantId: string, partyId: string): Promise<CaseRecord[]> =>
  withDbTiming('case.listByParty', async () => {
    const docs = await Case.find(tenantScoped({ Tenant: tenantId, 'parties.Party': toObjectId(partyId) }))
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
export const stats = async (tenantId: string, dueSoonDays: number, now: Date = new Date()): Promise<ListStats> =>
  withDbTiming('case.stats', async () => {
    const today = dateInDisplayTz(now);
    const count = (extra: object) => Case.countDocuments(tenantScoped({ Tenant: tenantId, ...extra }));
    const deadlines = (dueDate: object) =>
      Deadline.countDocuments(tenantScoped({ Tenant: tenantId, status: 'pending' as const, dueDate }));
    const [total, abertas, vencidas, proximas, entregues, trend] = await Promise.all([
      count({}),
      count({ status: { $in: ABERTAS } }),
      deadlines({ $lt: today }),
      deadlines({ $gte: today, $lte: addDays(today, dueSoonDays) }),
      count({ status: { $in: ['report_delivered', 'completed'] } }),
      dailyTrend(Case, tenantId, 'createdAt'),
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

export const distribution = async (tenantId: string): Promise<CaseDistribution> =>
  withDbTiming('case.distribution', async () => {
    const [status, courtType] = await Promise.all([
      groupStats(Case, tenantId, '$status', 'appointed'),
      groupStats(Case, tenantId, '$courtType', 'civil'),
    ]);
    return { status: status.groups, courtType: courtType.groups };
  });
