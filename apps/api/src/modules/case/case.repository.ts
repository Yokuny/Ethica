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
    type: party.type,
    name: party.name,
    ...(party.client ? { client: true } : {}),
  })),
  status: doc.status,
  phase: doc.phase,
  state: caseState(doc),
  nominationDate: doc.nominationDate,
  proposedFeesCents: doc.proposedFeesCents,
  fixedFeesCents: doc.fixedFeesCents,
  notes: doc.notes,
  docketingDate: doc.docketingDate,
  hireDate: doc.hireDate,
  terminationDate: doc.terminationDate,
  claimantJob: doc.claimantJob,
  nonPrescribedPeriodStart: doc.nonPrescribedPeriodStart,
  nonPrescribedPeriodEnd: doc.nonPrescribedPeriodEnd,
  location: doc.location,
  movements: [...(doc.movements ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((movement) => ({
      id: movement._id.toString(),
      type: movement.type,
      date: movement.date,
      notes: movement.notes,
    })),
  opportunityId: doc.Opportunity?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toPartiesDocs = (parties: CasePartyWrite[]) =>
  parties.map(({ partyId, ...party }) => ({ ...party, Party: partyId }));

// Derived state (AD-133) as a database filter: the same rule as `caseState`.
const stateFilter = {
  closed: { status: { $in: CASE_CLOSED_STATUSES } },
  suspended: { status: { $nin: CASE_CLOSED_STATUSES }, phase: { $in: CASE_PHASES_SUSPENSION } },
  active: { status: { $nin: CASE_CLOSED_STATUSES }, phase: { $nin: CASE_PHASES_SUSPENSION } },
};

// Statuses in which the case still has work ahead for the expert.
const OPEN = ['appointed', 'accepted', 'inspection', 'drafting_report', 'clarifications'];

export const createCase = async ({ tenant, opportunityId, parties, ...data }: CaseCreateWrite): Promise<CaseRecord> =>
  withDbTiming('case.createCase', async () => {
    const doc = await Case.create({
      ...data,
      parties: toPartiesDocs(parties),
      Tenant: tenant,
      Opportunity: opportunityId,
    });
    return toRecord(doc);
  });

// Every route by :id goes through here: the filter carries the Tenant, so an id from
// another tenant simply does not exist (AD-010).
export const findById = async (tenantId: string, id: string): Promise<CaseRecord | null> =>
  withDbTiming('case.findById', async () => {
    const doc = await Case.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// PDF duplicate warning (IMP-01.3): the id of the case with the same number in the tenant.
export const findIdByNumber = async (tenantId: string, processNumber: string): Promise<string | undefined> =>
  withDbTiming('case.findIdByNumber', async () => {
    const doc = await Case.findOne(tenantScoped({ Tenant: tenantId, processNumber }))
      .select('_id')
      .lean();
    return doc?._id.toString();
  });

// Only the given fields go into $set — an omitted field never becomes undefined.
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

// `null` when the case or the movement does not exist.
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

// Stalled case (AD-121): not closed and with the reference (last movement, otherwise the
// nomination, otherwise the registration day) before `limit`. From oldest to newest.
export const listStalled = async (tenantId: string, limit: string): Promise<Array<Omit<StalledCase, 'stalledDays'>>> =>
  withDbTiming('case.listStalled', async () => {
    const docs = await Case.aggregate<{
      _id: { toString(): string };
      processNumber: string;
      status: StalledCase['status'];
      court: string;
      division?: string;
      subject: string;
      last: string | null;
      nominationDate?: string;
      reference: string;
    }>([
      // Suspended (AD-133) is not stalled: it waits for a fact outside the expert's control.
      {
        $match: {
          Tenant: toObjectId(tenantId),
          status: { $nin: ['completed', 'declined'] },
          phase: { $nin: CASE_PHASES_SUSPENSION },
        },
      },
      { $addFields: { last: { $max: '$movements.date' } } },
      {
        $addFields: {
          reference: {
            $ifNull: [
              '$last',
              '$nominationDate',
              { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: DISPLAY_TIMEZONE } },
            ],
          },
        },
      },
      { $match: { reference: { $lt: limit } } },
      { $sort: { reference: 1, processNumber: 1 } },
      {
        $project: {
          processNumber: 1,
          status: 1,
          court: 1,
          division: 1,
          subject: 1,
          last: 1,
          nominationDate: 1,
          reference: 1,
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
      reference: doc.reference,
      origin: doc.last ? 'movement' : doc.nominationDate ? 'appointment' : 'created',
    }));
  });

// Data export (DOC-04): every case of the tenant.
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

    // Text search on Atlas Search (AD-054): word fragments, accent-insensitive, never regex.
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

// Cross-module enrichment: one `$in` query per batch, never one per item.
export const findSummariesByIds = async (tenantId: string, ids: string[]): Promise<Map<string, CaseSummary>> =>
  withDbTiming('case.findSummariesByIds', async () => {
    if (ids.length === 0) return new Map();
    const docs = await Case.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } }))
      .select('processNumber parties')
      .lean();
    const names = (parties: CaseDocument['parties'], side: string) =>
      (parties ?? [])
        .filter((party) => party.side === side && party.type === 'party')
        .map((party) => party.name)
        .join(', ') || undefined;
    return new Map(
      docs.map((doc) => [
        doc._id.toString(),
        {
          processNumber: doc.processNumber,
          plaintiff: names(doc.parties, 'plaintiff'),
          defendant: names(doc.parties, 'defendant'),
          client: doc.parties?.find((party) => party.client)?.name,
        },
      ]),
    );
  });

// Renaming the party updates the name copy in every case it appears in (AD-117).
export const renameParty = async (tenantId: string, partyId: string, name: string): Promise<void> =>
  withDbTiming('case.renameParty', async () => {
    await Case.updateMany(
      tenantScoped({ Tenant: tenantId, 'parties.Party': toObjectId(partyId) }),
      { $set: { 'parties.$[p].name': name } },
      { arrayFilters: [{ 'p.Party': toObjectId(partyId) }] },
    );
  });

// Cases the party appears in (IMP-03), from newest to oldest.
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

// Listing strip: open, overdue pending deadlines, deadlines due soon
// (up to `dueSoonDays`) and delivered reports.
export const stats = async (tenantId: string, dueSoonDays: number, now: Date = new Date()): Promise<ListStats> =>
  withDbTiming('case.stats', async () => {
    const today = dateInDisplayTz(now);
    const count = (extra: object) => Case.countDocuments(tenantScoped({ Tenant: tenantId, ...extra }));
    const deadlines = (dueDate: object) =>
      Deadline.countDocuments(tenantScoped({ Tenant: tenantId, status: 'pending' as const, dueDate }));
    const [total, open, vencidas, proximas, entregues, trend] = await Promise.all([
      count({}),
      count({ status: { $in: OPEN } }),
      deadlines({ $lt: today }),
      deadlines({ $gte: today, $lte: addDays(today, dueSoonDays) }),
      count({ status: { $in: ['report_delivered', 'completed'] } }),
      dailyTrend(Case, tenantId, 'createdAt'),
    ]);
    return {
      total,
      trend,
      groups: [
        { key: 'open', count: open },
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
