import type { CreateMovement, ListStats } from '@ethica/contracts';
import {
  CASE_CLOSED_PHASES,
  CASE_PHASE_GROUPS,
  type CasePhase,
  DISPLAY_TIMEZONE,
  TECHNICAL_ASSISTANCE_PHASES,
} from '@ethica/contracts';
import type { CaseDocument, SearchStage } from '@ethica/db';
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
  ServiceTypeItem,
  StalledCase,
} from './case.schema.js';
import type { CasePartyWrite } from './party.schema.js';

const toRecord = (doc: CaseDocument): CaseRecord => ({
  id: doc._id.toString(),
  processNumber: doc.processNumber,
  serviceOrder: doc.serviceOrder,
  courtType: doc.courtType,
  serviceType: doc.serviceType,
  role: doc.role,
  roleName: doc.roleName,
  phaseName: doc.phaseName,
  contractor: doc.contractor,
  court: doc.court,
  division: doc.division,
  district: doc.district,
  subject: doc.subject,
  // The same registration on the same side shows once (RSV-01), which also fixes cases saved with repeats.
  parties: (doc.parties ?? [])
    .filter(
      (party, index, all) =>
        all.findIndex(
          (other) => other.Party.equals(party.Party) && other.side === party.side && other.type === party.type,
        ) === index,
    )
    .map((party) => ({
      partyId: party.Party.toString(),
      side: party.side,
      type: party.type,
      name: party.name,
      ...(party.client ? { client: true } : {}),
    })),
  phase: doc.phase,
  status: doc.status,
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

// Still with work ahead for the expert (AD-178): not canceled nor in a closing phase.
const OPEN = { status: { $ne: 'canceled' }, phase: { $nin: CASE_CLOSED_PHASES } };
// Report already delivered: from "Laudo entregue" on, up to the fees received; in the assistance, from
// "Parecer técnico entregue" on (AD-186).
const { final, receiving } = CASE_PHASE_GROUPS;
const ASSISTANCE_DELIVERED = TECHNICAL_ASSISTANCE_PHASES.slice(
  TECHNICAL_ASSISTANCE_PHASES.indexOf('technical_opinion_delivered'),
  TECHNICAL_ASSISTANCE_PHASES.indexOf('fees_received'),
);
const DELIVERED: CasePhase[] = [
  ...final.slice(final.indexOf('report_delivered')),
  ...receiving,
  ...ASSISTANCE_DELIVERED,
];

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

// Number of the service registered last (AD-190), for the indicator of the services screen.
export const lastServiceOrder = async (tenantId: string): Promise<string | undefined> =>
  withDbTiming('case.lastServiceOrder', async () => {
    const doc = await Case.findOne(tenantScoped({ Tenant: tenantId, serviceOrder: { $type: 'string' as const } }))
      .sort({ createdAt: -1, _id: -1 })
      .select('serviceOrder')
      .lean();
    return doc?.serviceOrder;
  });

// Number already given to a service of the tenant, open or closed (AD-187).
export const hasServiceOrder = async (tenantId: string, serviceOrder: string): Promise<boolean> =>
  withDbTiming('case.hasServiceOrder', async () =>
    Boolean(await Case.exists(tenantScoped({ Tenant: tenantId, serviceOrder }))),
  );

// Only the given fields go into $set — an omitted field never becomes undefined.
export const updateCase = async (
  tenantId: string,
  id: string,
  { parties, ...data }: CaseUpdateWrite,
): Promise<CaseRecord | null> =>
  withDbTiming('case.updateCase', async () => {
    // `null` becomes `$unset` (service type, AD-158).
    const entries = Object.entries(data);
    const unset = entries.filter(([, value]) => value === null).map(([key]) => [key, 1]);
    const update = {
      ...Object.fromEntries(entries.filter(([, value]) => value !== undefined && value !== null)),
      ...(parties ? { parties: toPartiesDocs(parties) } : {}),
      ...(unset.length ? { $unset: Object.fromEntries(unset) } : {}),
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
      phase: StalledCase['phase'];
      phaseName?: string;
      court: string;
      division?: string;
      subject: string;
      last: string | null;
      nominationDate?: string;
      reference: string;
    }>([
      // Suspended is not stalled: it waits for a fact outside the expert's control.
      { $match: { Tenant: toObjectId(tenantId), ...OPEN, status: 'active' } },
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
          phase: 1,
          phaseName: 1,
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
      phase: doc.phase,
      phaseName: doc.phaseName,
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

// Listing order (AD-188): the name is the process number or, without one, the object; the type puts the
// perícia first, then the assistance, then the office's own types by name. Dates and the service order
// (AD-190) sort by the field itself.
const SORT_KEY: Partial<Record<ListCasesQuery['sort'], unknown>> = {
  name: { $toLower: { $ifNull: ['$processNumber', '$subject'] } },
  type: {
    $cond: [
      { $ifNull: ['$serviceType', false] },
      { $concat: ['2', { $toLower: '$serviceType' }] },
      { $cond: [{ $eq: ['$role', 'court_expert'] }, '0', '1'] },
    ],
  },
};

// `ids`: only these cases (delivery period, resolved by the service from the deadlines).
export const listCases = async (
  tenantId: string,
  query: ListCasesQuery,
  ids?: string[],
): Promise<{ items: CaseRecord[]; total: number }> =>
  withDbTiming('case.listCases', async () => {
    const filters = {
      ...(query.phase ? { phase: query.phase } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.courtType ? { courtType: query.courtType } : {}),
      // Perícia and Assistência técnica have no own type name (AD-177).
      ...(query.role ? { role: query.role, serviceType: { $exists: false } } : {}),
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
      ...(ids ? { _id: { $in: ids.map(toObjectId) } } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const direction: 1 | -1 = query.order === 'asc' ? 1 : -1;
    const tie: Record<string, 1 | -1> = query.sort === 'createdAt' ? { _id: direction } : { createdAt: -1, _id: 1 };
    const search = query.q || query.serviceOrder;
    const sortKey = SORT_KEY[query.sort] ?? `$${query.sort}`;
    const pipeline: SearchStage[] = [
      // Text search and the OS filter on Atlas Search (AD-054): word fragments, accent-insensitive, never regex.
      ...(search ? caseSearchStages(tenantId, { q: query.q, serviceOrder: query.serviceOrder }) : []),
      { $match: { Tenant: toObjectId(tenantId), ...filters } },
      // A service without the value (no OS) goes to the end in both directions.
      { $addFields: { sortKey, sortMissing: { $cond: [{ $ifNull: [sortKey, false] }, 0, 1] } } },
      {
        $facet: {
          items: [
            // Ties: the newest registration first.
            { $sort: { sortMissing: 1, sortKey: direction, ...tie } },
            { $skip: skip },
            { $limit: query.limit },
          ],
          total: [{ $count: 'n' }],
        },
      },
    ];
    const run = () => Case.aggregate<{ items: CaseDocument[]; total: { n: number }[] }>(pipeline);
    const [result] = search ? await withSearch(run) : await run();
    return { items: (result?.items ?? []).map(toRecord), total: result?.total[0]?.n ?? 0 };
  });

// Cross-module enrichment: one `$in` query per batch, never one per item.
export const findSummariesByIds = async (tenantId: string, ids: string[]): Promise<Map<string, CaseSummary>> =>
  withDbTiming('case.findSummariesByIds', async () => {
    if (ids.length === 0) return new Map();
    const docs = await Case.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } }))
      .select('processNumber subject court division parties contractor role serviceType courtType')
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
          subject: doc.subject,
          court: doc.court,
          division: doc.division,
          plaintiff: names(doc.parties, 'plaintiff'),
          defendant: names(doc.parties, 'defendant'),
          client: doc.contractor?.name ?? doc.parties?.find((party) => party.client)?.name,
          role: doc.role,
          serviceType: doc.serviceType,
          courtType: doc.courtType,
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

// Merged duplicate (PSV-05): the cases of `fromId` point to `toId`; the same party twice on the same
// side of a case stays once.
export const replaceParty = async (tenantId: string, fromId: string, toId: string, name: string): Promise<void> =>
  withDbTiming('case.replaceParty', async () => {
    const docs = await Case.find(tenantScoped({ Tenant: tenantId, 'parties.Party': toObjectId(fromId) }))
      .select('parties')
      .lean();
    for (const doc of docs) {
      const parties = doc.parties
        .map((party) => (party.Party.toString() === fromId ? { ...party, Party: toObjectId(toId), name } : party))
        .filter(
          (party, index, all) =>
            all.findIndex((other) => other.Party.toString() === party.Party.toString() && other.side === party.side) ===
            index,
        );
      await Case.updateOne(tenantScoped({ Tenant: tenantId, _id: doc._id }), { $set: { parties } });
    }
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
      count(OPEN),
      deadlines({ $lt: today }),
      deadlines({ $gte: today, $lte: addDays(today, dueSoonDays) }),
      count({ phase: { $in: DELIVERED } }),
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
    // Without a sphere (not a perícia, AD-178) is `none`, left out of the chart.
    const [phase, courtType] = await Promise.all([
      groupStats(Case, tenantId, '$phase', 'awaiting_scheduling'),
      groupStats(Case, tenantId, '$courtType', 'none'),
    ]);
    return { phase: phase.groups, courtType: courtType.groups };
  });

// Service types created by the office (AD-158): the names already used, by name.
export const listServiceTypes = async (tenantId: string): Promise<ServiceTypeItem[]> =>
  withDbTiming('case.listServiceTypes', async () => {
    const rows = await Case.aggregate<{
      _id: string;
      role: ServiceTypeItem['role'];
      roleName?: string;
      phases: (string | null)[];
    }>([
      { $match: { Tenant: toObjectId(tenantId), serviceType: { $type: 'string' } } },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: '$serviceType',
          role: { $first: '$role' },
          roleName: { $first: '$roleName' },
          phases: { $addToSet: '$phaseName' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((row) => ({
      name: row._id,
      role: row.role,
      ...(row.roleName ? { roleName: row.roleName } : {}),
      phases: row.phases.filter((phase): phase is string => Boolean(phase)).sort(),
    }));
  });
