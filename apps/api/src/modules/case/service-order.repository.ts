import type { ServiceOrderSettings } from '@ethica/contracts';
import { ServiceOrderSequence, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';

const toSettings = (doc: { prefix: string; year: number; last: number }): ServiceOrderSettings => ({
  prefix: doc.prefix,
  year: doc.year,
  last: doc.last,
});

export const find = async (tenantId: string): Promise<ServiceOrderSettings | null> =>
  withDbTiming('serviceOrder.find', async () => {
    const doc = await ServiceOrderSequence.findOne(tenantScoped({ Tenant: tenantId })).lean();
    return doc ? toSettings(doc) : null;
  });

export const save = async (tenantId: string, data: ServiceOrderSettings): Promise<ServiceOrderSettings> =>
  withDbTiming('serviceOrder.save', async () => {
    const doc = await ServiceOrderSequence.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId }),
      { $set: data },
      { upsert: true, returnDocument: 'after', runValidators: true },
    ).lean();
    return toSettings(doc as NonNullable<typeof doc>);
  });

// Takes the next number in one update (NLA-01): two services registered at the same time never share it.
// Another year starts again at 1. `null`: the office has no sequence.
export const take = async (tenantId: string, year: number): Promise<ServiceOrderSettings | null> =>
  withDbTiming('serviceOrder.take', async () => {
    const doc = await ServiceOrderSequence.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId }),
      [{ $set: { last: { $cond: [{ $eq: ['$year', year] }, { $add: ['$last', 1] }, 1] }, year } }],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toSettings(doc) : null;
  });
