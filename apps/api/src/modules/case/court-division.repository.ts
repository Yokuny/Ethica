import type { CourtDivisionDocument } from '@ethica/db';
import { COURT_DIVISION_COLLATION, CourtDivision, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CourtDivisionRecord,
  CreateCourtDivision,
  ListCourtDivisionsQuery,
  UpdateCourtDivision,
} from './court-division.schema.js';

const LIST_MAX = 500;

const toRecord = (doc: CourtDivisionDocument): CourtDivisionRecord => ({
  id: doc._id.toString(),
  courtType: doc.courtType,
  name: doc.name,
  court: doc.court,
  state: doc.state,
  city: doc.city,
  address: doc.address,
  phones: doc.phones,
  email: doc.email,
  virtualDesk: doc.virtualDesk,
  notes: doc.notes,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const create = async (tenantId: string, data: CreateCourtDivision): Promise<CourtDivisionRecord> =>
  withDbTiming('courtDivision.create', async () => toRecord(await CourtDivision.create({ ...data, Tenant: tenantId })));

// City compared without case and accents ("sao paulo" finds "São Paulo").
export const list = async (tenantId: string, query: ListCourtDivisionsQuery): Promise<CourtDivisionRecord[]> =>
  withDbTiming('courtDivision.list', async () => {
    const docs = await CourtDivision.find(
      tenantScoped({
        Tenant: tenantId,
        ...(query.state ? { state: query.state } : {}),
        ...(query.city ? { city: query.city } : {}),
        ...(query.courtType ? { courtType: query.courtType } : {}),
      }),
    )
      .collation(COURT_DIVISION_COLLATION)
      .sort({ state: 1, city: 1, name: 1 })
      .limit(LIST_MAX)
      .lean();
    return docs.map(toRecord);
  });

export const cities = async (tenantId: string, state: string): Promise<string[]> =>
  withDbTiming('courtDivision.cities', async () => {
    const result = await CourtDivision.aggregate<{ _id: string }>(
      [{ $match: { Tenant: toObjectId(tenantId), state } }, { $group: { _id: '$city' } }, { $sort: { _id: 1 } }],
      { collation: COURT_DIVISION_COLLATION },
    );
    return result.map((item) => item._id);
  });

// Only the given fields; an emptied optional field is removed.
export const update = async (
  tenantId: string,
  id: string,
  data: UpdateCourtDivision,
): Promise<CourtDivisionRecord | null> =>
  withDbTiming('courtDivision.update', async () => {
    const $set = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const $unset = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value === undefined)
        .map(([field]) => [field, 1]),
    );
    const doc = await CourtDivision.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set, ...(Object.keys($unset).length ? { $unset } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const remove = async (tenantId: string, id: string): Promise<boolean> =>
  withDbTiming('courtDivision.remove', async () => {
    const result = await CourtDivision.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return result.deletedCount === 1;
  });
