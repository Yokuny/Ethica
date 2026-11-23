import * as platformRepository from './platform.repository.js';
import type { ProvisionTenant } from './platform.schema.js';

export const provisionTenant = (data: ProvisionTenant): Promise<{ id: string }> =>
  platformRepository.createTenant(data);
