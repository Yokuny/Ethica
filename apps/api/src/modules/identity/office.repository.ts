import { TENANT_STORAGE_QUOTA_BYTES } from '@ethica/contracts';
import { Tenant } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { TenantLogo, UpdateOffice } from './office.schema.js';

export const findOffice = async (tenantId: string) =>
  withDbTiming('office.findOffice', async () =>
    Tenant.findById(tenantId).select('name header footer logo storageBytes scheduleNotice').lean(),
  );

// Empty text clears the header/footer: the documents go back to the default.
export const updateTexts = async (tenantId: string, data: UpdateOffice): Promise<void> =>
  withDbTiming('office.updateTexts', async () => {
    const entries = Object.entries(data);
    const $set = Object.fromEntries(entries.filter(([, value]) => value));
    const $unset = Object.fromEntries(entries.filter(([, value]) => !value).map(([key]) => [key, 1]));
    await Tenant.updateOne(
      { _id: tenantId },
      { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
    );
  });

// Swaps the logo reserving the size difference in the quota (AD-120). The condition on the current
// logo prevents two simultaneous swaps from counting wrong. `false`: the quota does not fit it.
export const replaceLogo = async (tenantId: string, logo: TenantLogo, current?: TenantLogo): Promise<boolean> =>
  withDbTiming('office.replaceLogo', async () => {
    const delta = logo.bytes - (current?.bytes ?? 0);
    const result = await Tenant.updateOne(
      {
        _id: tenantId,
        storageBytes: { $lte: TENANT_STORAGE_QUOTA_BYTES - delta },
        ...(current ? { 'logo.key': current.key } : { logo: { $exists: false } }),
      },
      { $set: { logo: { ...logo, updatedAt: new Date() } }, $inc: { storageBytes: delta } },
    );
    return result.modifiedCount === 1;
  });

export const removeLogo = async (tenantId: string, current: TenantLogo): Promise<void> =>
  withDbTiming('office.removeLogo', async () => {
    await Tenant.updateOne(
      { _id: tenantId, 'logo.key': current.key },
      { $unset: { logo: 1 }, $inc: { storageBytes: -current.bytes } },
    );
  });

// A new file from another module (inspection media, AD-129) reserves the quota space in the same
// update that checks the limit. `false`: the quota does not fit it.
export const reserveBytes = async (tenantId: string, bytes: number): Promise<boolean> =>
  withDbTiming('office.reserveBytes', async () => {
    const result = await Tenant.updateOne(
      { _id: tenantId, storageBytes: { $lte: TENANT_STORAGE_QUOTA_BYTES - bytes } },
      { $inc: { storageBytes: bytes } },
    );
    return result.modifiedCount === 1;
  });

export const returnBytes = async (tenantId: string, bytes: number): Promise<void> =>
  withDbTiming('office.returnBytes', async () => {
    await Tenant.updateOne({ _id: tenantId }, { $inc: { storageBytes: -bytes } });
  });

export const setScheduleNotice = async (tenantId: string, notice: { subject: string; body: string }) =>
  withDbTiming('office.setScheduleNotice', async () => {
    await Tenant.updateOne({ _id: tenantId }, { $set: { scheduleNotice: notice } });
  });
