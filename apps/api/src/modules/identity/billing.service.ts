import crypto from 'node:crypto';
import {
  BILLING_GRACE_DAYS,
  BILLING_PLAN_CENTS,
  BILLING_TRIAL_DAYS,
  type BillingPlan,
  type BillingView,
  type TenantUser,
} from '@ethica/contracts';
import { dateInDisplayTz, wallClockToUtc } from '@ethica/db';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { type AsaasCharge, type AsaasClient, AsaasUnavailableError } from '../../providers/asaasClient.js';
import * as authRepository from './auth.repository.js';
import * as billingRepository from './billing.repository.js';
import { type AsaasWebhook, asaasWebhookSchema, type BillingTenant } from './billing.schema.js';

// AD-230: the office pays in Asaas; each confirmed payment extends `Tenant.accessUntil`.

const shiftDate = (date: string, { months = 0, days = 0 }) => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1 + months, day + days)).toISOString().slice(0, 10);
};

// Start of the day (display time zone, AD-036) the access ends: paid period plus the grace of the
// monthly payment; the trial has no grace.
export const accessUntilFor = (plan: BillingPlan, from: string): Date => {
  const end =
    plan === 'trial'
      ? shiftDate(from, { days: BILLING_TRIAL_DAYS })
      : shiftDate(from, { months: plan === 'yearly' ? 12 : 1, days: BILLING_GRACE_DAYS });
  return wallClockToUtc(end, '00:00');
};

const findTenant = async (tenantId: string): Promise<BillingTenant> => {
  const tenant = await billingRepository.findBillingTenant(tenantId);
  if (!tenant) throw new CustomError('not_found', 404);
  return tenant;
};

export const getBillingView = async (tenantUser: TenantUser): Promise<BillingView> => {
  const tenant = await findTenant(tenantUser.tenant as string);
  const firstPayment = !tenant.billing?.paidAt;
  return {
    firstPayment,
    trialAvailable: firstPayment,
    canPay: tenantUser.role.includes('admin'),
    accessUntil: tenant.accessUntil?.toISOString(),
  };
};

const customerOf = async (asaas: AsaasClient, tenant: BillingTenant, userId: string): Promise<string> => {
  if (tenant.billing?.customerId) return tenant.billing.customerId;
  const user = await authRepository.findUserView(userId);
  const customerId = await asaas.createCustomer({
    name: tenant.name,
    cpfCnpj: tenant.document,
    email: user?.email ?? '',
    externalReference: tenant.id,
  });
  await billingRepository.updateBilling(tenant.id, { customerId });
  return customerId;
};

const charge = async (
  asaas: AsaasClient,
  tenant: BillingTenant,
  customer: string,
  plan: BillingPlan,
  successUrl: string,
): Promise<AsaasCharge> => {
  const today = dateInDisplayTz(new Date());
  const valueCents = BILLING_PLAN_CENTS[plan];
  if (plan === 'monthly' || plan === 'yearly') {
    // CHK-08: one live subscription — the previous one (failed card, abandoned invoice) goes away.
    const previous = tenant.billing?.subscriptionId;
    if (previous) await asaas.deleteSubscription(previous).catch(() => undefined);
    const subscription = await asaas.createSubscription({
      customer,
      valueCents,
      cycle: plan === 'yearly' ? 'YEARLY' : 'MONTHLY',
      nextDueDate: today,
      successUrl,
    });
    await billingRepository.updateBilling(tenant.id, { subscriptionId: subscription.id, subscriptionPlan: plan });
    return subscription;
  }
  const payment = await asaas.createPayment({
    customer,
    valueCents,
    dueDate: today,
    externalReference: plan,
    successUrl,
  });
  if (plan === 'trial') {
    await billingRepository.updateBilling(tenant.id, {
      trialPaymentId: payment.id,
      trialInvoiceUrl: payment.invoiceUrl,
    });
  }
  return payment;
};

// Returns the Asaas invoice the person pays on; the access comes later, by webhook.
export const pay = async (
  deps: { asaas?: AsaasClient; appUrl: string },
  tenantUser: TenantUser,
  plan: BillingPlan,
): Promise<{ url: string }> => {
  if (!deps.asaas) throw new CustomError('billing_not_configured', 503);
  const tenant = await findTenant(tenantUser.tenant as string);
  if (plan === 'trial') {
    if (tenant.billing?.paidAt) throw new CustomError('trial_unavailable', 409);
    // Trial once: a second click returns the same invoice.
    if (tenant.billing?.trialInvoiceUrl) return { url: tenant.billing.trialInvoiceUrl };
  }
  try {
    const customer = await customerOf(deps.asaas, tenant, tenantUser.user);
    const { invoiceUrl } = await charge(deps.asaas, tenant, customer, plan, `${deps.appUrl}/`);
    return { url: invoiceUrl };
  } catch (e) {
    if (e instanceof AsaasUnavailableError) throw new CustomError('billing_unavailable', 502);
    throw e;
  }
};

export const validWebhookToken = (expected: string | undefined, received: unknown): boolean => {
  if (!expected || typeof received !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const PAID_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];

// Plan and starting date of a payment of this office, or nothing when it is not an Ethica charge.
// The date is fixed in the payment, so the same event twice gives the same access.
const periodOf = (
  payment: NonNullable<AsaasWebhook['payment']>,
  billing: NonNullable<BillingTenant['billing']>,
): { plan: BillingPlan; from?: string | null } | undefined => {
  const paidOn = payment.confirmedDate ?? payment.paymentDate;
  if (payment.subscription) {
    if (payment.subscription !== billing.subscriptionId || !billing.subscriptionPlan) return undefined;
    return { plan: billing.subscriptionPlan, from: payment.dueDate };
  }
  if (payment.id === billing.trialPaymentId) return { plan: 'trial', from: paidOn };
  if (payment.externalReference === 'single_month') return { plan: 'single_month', from: paidOn };
  return undefined;
};

// CHK-09: unknown event, customer or charge is ignored without error (Asaas stops the queue on errors).
export const receiveWebhook = async (body: unknown): Promise<void> => {
  const parsed = asaasWebhookSchema.safeParse(body);
  if (!parsed.success) return;
  const { event, payment } = parsed.data;
  if (!payment || !PAID_EVENTS.includes(event)) return;
  const tenant = await billingRepository.findTenantByCustomer(payment.customer);
  if (!tenant?.billing) return;
  const period = periodOf(payment, tenant.billing);
  if (!period?.from) return;
  await billingRepository.extendAccess(tenant.id, accessUntilFor(period.plan, period.from));
};
