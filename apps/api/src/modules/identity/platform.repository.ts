import { Tenant } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';

export const createTenant = async (data: { name: string; document: string }): Promise<{ id: string }> =>
  withDbTiming('platform.createTenant', async () => {
    const tenant = await Tenant.create(data);
    return { id: tenant.id };
  });
