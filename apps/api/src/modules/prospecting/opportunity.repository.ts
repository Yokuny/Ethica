import type { ListStats, OpportunityStatus } from '@ethica/contracts';
import type { OpportunityDocument } from '@ethica/db';
import { dailyTrend, groupStats, Opportunity, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CreateOpportunity,
  ListOpportunitiesQuery,
  OpportunityRecord,
  UpdateOpportunity,
} from './opportunity.schema.js';

const toRecord = (doc: OpportunityDocument): OpportunityRecord => ({
  id: doc._id.toString(),
  processNumber: doc.processNumber,
  court: doc.court,
  caseClass: doc.caseClass,
  subjects: doc.subjects ?? [],
  courtUnit: doc.courtUnit,
  filingDate: doc.filingDate,
  lastMovement: doc.lastMovement,
  lastMovementAt: doc.lastMovementAt,
  status: doc.status,
  observacoes: doc.observacoes,
  caseId: doc.Case?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createOpportunity = async (tenantId: string, data: CreateOpportunity): Promise<OpportunityRecord> =>
  withDbTiming('prospecting.createOpportunity', async () => {
    const doc = await Opportunity.create({ Tenant: tenantId, ...data });
    return toRecord(doc);
  });

export const findById = async (tenantId: string, id: string): Promise<OpportunityRecord | null> =>
  withDbTiming('prospecting.findById', async () => {
    const doc = await Opportunity.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// A guarda contra editar uma convertida é a própria query (status ≠ convertida).
export const updateOpportunity = async (
  tenantId: string,
  id: string,
  data: Omit<UpdateOpportunity, 'status'> & { status?: OpportunityStatus; caseId?: string },
): Promise<OpportunityRecord | null> =>
  withDbTiming('prospecting.updateOpportunity', async () => {
    const { caseId, ...fields } = data;
    const update = {
      ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
      ...(caseId ? { Case: caseId } : {}),
    };
    const doc = await Opportunity.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, status: { $ne: 'converted' as const } }),
      update,
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteOpportunity = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('prospecting.deleteOpportunity', async () => {
    const result = await Opportunity.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const listOpportunities = async (
  tenantId: string,
  query: ListOpportunitiesQuery,
): Promise<{ items: OpportunityRecord[]; total: number }> =>
  withDbTiming('prospecting.listOpportunities', async () => {
    const filter = tenantScoped({ Tenant: tenantId, ...(query.status ? { status: query.status } : {}) });
    const [docs, total] = await Promise.all([
      Opportunity.find(filter)
        .sort({ createdAt: -1, _id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Opportunity.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

export const findIdsByNumeros = async (tenantId: string, numeros: string[]): Promise<Map<string, string>> =>
  withDbTiming('prospecting.findIdsByNumeros', async () => {
    if (numeros.length === 0) return new Map();
    const docs = await Opportunity.find(tenantScoped({ Tenant: tenantId, processNumber: { $in: numeros } }))
      .select('processNumber')
      .lean();
    return new Map(docs.map((doc) => [doc.processNumber, doc._id.toString()]));
  });

export const stats = async (tenantId: string): Promise<ListStats> =>
  withDbTiming('prospecting.stats', async () => {
    const [{ total, groups }, trend] = await Promise.all([
      groupStats(Opportunity, tenantId, '$status', 'new'),
      dailyTrend(Opportunity, tenantId, 'createdAt'),
    ]);
    return { total, trend, groups };
  });

// Exportação de dados (DOC-04).
export const listAll = async (tenantId: string): Promise<OpportunityRecord[]> =>
  withDbTiming('opportunity.listAll', async () => {
    const docs = await Opportunity.find(tenantScoped({ Tenant: tenantId }))
      .sort({ createdAt: 1 })
      .lean();
    return docs.map(toRecord);
  });
