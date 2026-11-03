import { SERVICE_ORDER_PATTERN_DEFAULT, type ServiceOrderSettings } from '@ethica/contracts';
import { ServiceOrderSequence, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';

// A sequence saved before the custom pattern (AD-172) reads as the suggested pattern.
const toSettings = (doc: {
  pattern?: string;
  prefix?: string;
  digits?: number;
  year: number;
  last: number;
}): ServiceOrderSettings => ({
  pattern: doc.pattern ?? SERVICE_ORDER_PATTERN_DEFAULT,
  prefix: doc.prefix ?? '',
  digits: doc.digits ?? 3,
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
// Another year starts again at 1, only when the pattern shows the year (AD-172). `null`: the office has no sequence.
export const take = async (tenantId: string, year: number): Promise<ServiceOrderSettings | null> =>
  withDbTiming('serviceOrder.take', async () => {
    const doc = await ServiceOrderSequence.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId }),
      [
        {
          $set: {
            last: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$year', year] },
                    { $eq: [{ $indexOfCP: [{ $ifNull: ['$pattern', SERVICE_ORDER_PATTERN_DEFAULT] }, '[ANO]'] }, -1] },
                  ],
                },
                { $add: ['$last', 1] },
                1,
              ],
            },
            year,
          },
        },
      ],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toSettings(doc) : null;
  });
