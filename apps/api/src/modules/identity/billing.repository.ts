import { Tenant } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { BillingTenant } from './billing.schema.js';

const toBillingTenant = (tenant: {
  _id: { toString: () => string };
  name: string;
  document: string;
  accessUntil?: Date;
  automationUntil?: Date;
  billing?: BillingTenant['billing'];
}): BillingTenant => ({
  id: tenant._id.toString(),
  name: tenant.name,
  document: tenant.document,
  accessUntil: tenant.accessUntil,
  automationUntil: tenant.automationUntil,
  billing: tenant.billing,
});

export const findBillingTenant = async (tenantId: string): Promise<BillingTenant | null> =>
  withDbTiming('billing.findBillingTenant', async () => {
    const tenant = await Tenant.findById(tenantId).select('name document accessUntil automationUntil billing').lean();
    return tenant ? toBillingTenant(tenant) : null;
  });

export const findTenantByCustomer = async (customerId: string): Promise<BillingTenant | null> =>
  withDbTiming('billing.findTenantByCustomer', async () => {
    const tenant = await Tenant.findOne({ 'billing.customerId': customerId })
      .select('name document accessUntil automationUntil billing')
      .lean();
    return tenant ? toBillingTenant(tenant) : null;
  });

// Only the given keys of `billing` change.
export const updateBilling = async (tenantId: string, data: Partial<NonNullable<BillingTenant['billing']>>) =>
  withDbTiming('billing.updateBilling', async () => {
    const set = Object.fromEntries(Object.entries(data).map(([key, value]) => [`billing.${key}`, value]));
    await Tenant.updateOne({ _id: tenantId }, { $set: set });
  });

// $max: the same payment received twice (or CONFIRMED then RECEIVED) gives the same date. Paid, nothing is
// pending any more: the plans screen stops checking Asaas (AD-251). An automation plan extends the module too
// (AD-275).
export const extendAccess = async (tenantId: string, accessUntil: Date, automation = false) =>
  withDbTiming('billing.extendAccess', async () => {
    await Tenant.updateOne(
      { _id: tenantId },
      {
        $max: { accessUntil, ...(automation ? { automationUntil: accessUntil } : {}) },
        $set: { 'billing.paidAt': new Date() },
        $unset: { 'billing.pendingSince': 1 },
      },
    );
  });

// AD-232: $min — refund or chargeback brings the access back to the start of the period it had paid.
export const revokeAccess = async (tenantId: string, accessUntil: Date, automation = false) =>
  withDbTiming('billing.revokeAccess', async () => {
    await Tenant.updateOne(
      { _id: tenantId },
      { $min: { accessUntil, ...(automation ? { automationUntil: accessUntil } : {}) } },
    );
  });
