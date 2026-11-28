import crypto from 'node:crypto';
import {
  AUTOMATION_PLANS,
  BILLING_GRACE_DAYS,
  BILLING_PLAN_CENTS,
  type BillingCharge,
  type BillingPaymentQuery,
  type BillingPaymentView,
  type BillingPlan,
  type BillingView,
  hasAutomation,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  type TenantUser,
  YEARLY_PLANS,
} from '@ethica/contracts';
import { dateInDisplayTz, wallClockToUtc } from '@ethica/db';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import { type AsaasCharge, type AsaasClient, AsaasUnavailableError } from '../../providers/asaas-client.js';
import * as authRepository from './auth.repository.js';
import * as billingRepository from './billing.repository.js';
import { type AsaasPaymentData, asaasPaymentSchema, asaasWebhookSchema, type BillingTenant } from './billing.schema.js';

// AD-230: the office pays in Asaas; each confirmed payment extends `Tenant.accessUntil` and, on an automation
// plan, `Tenant.automationUntil` too (AD-275).

const shiftDate = (date: string, { months = 0, days = 0 }) => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1 + months, day + days)).toISOString().slice(0, 10);
};

// Start of the day (display time zone, AD-036) the access ends: the paid period (a month, the trial
// included, AD-247, or a year) plus the grace (AD-231).
export const accessUntilFor = (plan: BillingPlan, from: string): Date =>
  wallClockToUtc(shiftDate(from, { months: YEARLY_PLANS.includes(plan) ? 12 : 1, days: BILLING_GRACE_DAYS }), '00:00');

const BOLETO_DUE_DAYS = 3;

const findTenant = async (tenantId: string): Promise<BillingTenant> => {
  const tenant = await billingRepository.findBillingTenant(tenantId);
  if (!tenant) throw new CustomError('not_found', 404);
  return tenant;
};

const PAID_STATUSES = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'];

// CHK-14: when the plans screen may be waiting on a payment the webhook did not bring (dev has no public URL;
// production may have it late). Only with the access closed and something to wait for: the office never paid,
// created a charge in the last days, or has a card subscription (its renewal). At most one Asaas call per office
// every 30 s.
const CHECK_EVERY_MS = 30_000;
const PENDING_MS = 7 * 24 * 3600_000;
const lastCheck = new Map<string, number>();

const shouldCheck = (tenant: BillingTenant, now: number): boolean => {
  const billing = tenant.billing;
  if (!billing?.customerId || (tenant.accessUntil && tenant.accessUntil.getTime() > now)) return false;
  const waiting =
    !billing.paidAt ||
    billing.subscriptionId ||
    (billing.pendingSince && now - billing.pendingSince.getTime() < PENDING_MS);
  if (!waiting || now - (lastCheck.get(tenant.id) ?? 0) < CHECK_EVERY_MS) return false;
  lastCheck.set(tenant.id, now);
  return true;
};

// The latest charges of the office in Asaas, each paid one applied as the webhook would. Asaas failing
// leaves the screen as it is: the next check (or the webhook) tries again.
const checkPayments = async (asaas: AsaasClient, tenant: BillingTenant): Promise<boolean> => {
  let granted = false;
  try {
    for (const raw of await asaas.listPayments(tenant.billing?.customerId as string)) {
      const payment = asaasPaymentSchema.safeParse(raw);
      if (payment.success && PAID_STATUSES.includes(payment.data.status ?? '')) {
        granted = (await grant(tenant, payment.data)) === undefined || granted;
      }
    }
  } catch (e) {
    if (!(e instanceof AsaasUnavailableError)) throw e;
  }
  return granted;
};

export const getBillingView = async (deps: { asaas?: AsaasClient }, tenantUser: TenantUser): Promise<BillingView> => {
  let tenant = await findTenant(tenantUser.tenant as string);
  if (deps.asaas && shouldCheck(tenant, Date.now()) && (await checkPayments(deps.asaas, tenant))) {
    tenant = await findTenant(tenant.id);
  }
  const firstPayment = !tenant.billing?.paidAt;
  return {
    firstPayment,
    trialAvailable: firstPayment,
    canPay: tenantUser.role.includes('admin'),
    accessUntil: tenant.accessUntil?.toISOString(),
    automationUntil: tenant.automationUntil?.toISOString(),
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
  successUrl: string | undefined,
): Promise<AsaasCharge> => {
  const today = dateInDisplayTz(new Date());
  const valueCents = BILLING_PLAN_CENTS[plan];
  if ((SUBSCRIPTION_PLANS as readonly string[]).includes(plan)) {
    // CHK-08: one live subscription — the previous one (failed card, abandoned invoice, the other plan) goes away.
    const previous = tenant.billing?.subscriptionId;
    if (previous) await asaas.deleteSubscription(previous);
    const id = await asaas.createSubscription({
      customer,
      valueCents,
      cycle: YEARLY_PLANS.includes(plan) ? 'YEARLY' : 'MONTHLY',
      nextDueDate: today,
      successUrl,
    });
    // Saved before the invoice is fetched: a failure there still leaves the live subscription known.
    await billingRepository.updateBilling(tenant.id, {
      subscriptionId: id,
      subscriptionPlan: plan as SubscriptionPlan,
    });
    return asaas.firstPayment(id);
  }
  const payment = await asaas.createPayment({
    customer,
    valueCents,
    // The boleto takes days to clear; the access counts from the payment day, not from this date.
    dueDate: shiftDate(today, { days: BOLETO_DUE_DAYS }),
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

// Returns the charge: the web opens the Asaas invoice for the card, its own screen for PIX and boleto (AD-251).
// The access comes later, by webhook or by the check of the plans screen.
export const pay = async (
  deps: { asaas?: AsaasClient; returnUrl?: string },
  tenantUser: TenantUser,
  plan: BillingPlan,
): Promise<BillingCharge> => {
  if (!deps.asaas) throw new CustomError('billing_not_configured', 503);
  const tenant = await findTenant(tenantUser.tenant as string);
  if (plan === 'trial' && tenant.billing?.paidAt) throw new CustomError('trial_unavailable', 409);
  try {
    // Trial once: a second click returns the same charge.
    const reused =
      plan === 'trial' && tenant.billing?.trialPaymentId && tenant.billing.trialInvoiceUrl
        ? { id: tenant.billing.trialPaymentId, invoiceUrl: tenant.billing.trialInvoiceUrl }
        : undefined;
    const { id, invoiceUrl } =
      reused ??
      (await charge(deps.asaas, tenant, await customerOf(deps.asaas, tenant, tenantUser.user), plan, deps.returnUrl));
    await billingRepository.updateBilling(tenant.id, { pendingSince: new Date() });
    return { paymentId: id, url: invoiceUrl };
  } catch (e) {
    if (e instanceof AsaasUnavailableError) throw new CustomError('billing_unavailable', 502);
    throw e;
  }
};

// CHK-12, CHK-13: the PIX or boleto of a charge of this office, for the Ethica screen.
export const getPaymentView = async (
  deps: { asaas?: AsaasClient },
  tenantUser: TenantUser,
  id: string,
  { method }: BillingPaymentQuery,
): Promise<BillingPaymentView> => {
  if (!deps.asaas) throw new CustomError('billing_not_configured', 503);
  const asaas = deps.asaas;
  const tenant = await findTenant(tenantUser.tenant as string);
  try {
    const payment = asaasPaymentSchema.safeParse(await asaas.getPayment(id));
    if (!payment.success || payment.data.customer !== tenant.billing?.customerId) {
      throw new CustomError('not_found', 404);
    }
    const { value, dueDate, status, bankSlipUrl } = payment.data;
    const view: BillingPaymentView = {
      id,
      valueCents: Math.round((value ?? 0) * 100),
      dueDate,
      paid: PAID_STATUSES.includes(status ?? ''),
    };
    if (view.paid) return view;
    if (method === 'boleto') {
      const { identificationField } = await asaas.boletoLine(id);
      return { ...view, boleto: { line: identificationField, pdfUrl: bankSlipUrl ?? '' } };
    }
    // Asaas refuses the QR Code when the account has no Pix key.
    const qrCode = await asaas.pixQrCode(id).catch((e: unknown) => {
      if (e instanceof AsaasUnavailableError && e.status === 400) throw new CustomError('pix_unavailable', 502);
      throw e;
    });
    return { ...view, pix: { image: qrCode.encodedImage, code: qrCode.payload, expiresAt: qrCode.expirationDate } };
  } catch (e) {
    if (e instanceof AsaasUnavailableError) {
      throw e.status === 404 ? new CustomError('not_found', 404) : new CustomError('billing_unavailable', 502);
    }
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
// AD-232: refund and chargeback take back the period the payment paid. A partial refund does not.
const REVOKED_EVENTS = ['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'];

// Plan and starting date of a payment of this office, or the reason it is not an Ethica charge.
// The date is fixed in the payment, so the same event twice gives the same access.
const periodOf = (
  payment: AsaasPaymentData,
  billing: NonNullable<BillingTenant['billing']>,
  granting: boolean,
): { plan: BillingPlan; from?: string | null } | string => {
  const paidOn = payment.confirmedDate ?? payment.paymentDate;
  if (payment.subscription) {
    if (payment.subscription !== billing.subscriptionId || !billing.subscriptionPlan) return 'replaced_subscription';
    return { plan: billing.subscriptionPlan, from: payment.dueDate };
  }
  if (payment.id === billing.trialPaymentId) {
    // An old trial invoice paid after another payment grants nothing.
    if (granting && billing.paidAt) return 'trial_after_payment';
    return { plan: 'trial', from: paidOn };
  }
  if (payment.externalReference === 'single_month') return { plan: 'single_month', from: paidOn };
  return 'unknown_charge';
};

// A paid or revoked event that changes nothing is logged: it may be money without access, or access
// without money.
const ignore = (reason: string, body: unknown) => {
  const { event, payment } = body as { event?: unknown; payment?: { id?: unknown; customer?: unknown } };
  console.error(
    JSON.stringify({
      event: 'billing.payment_ignored',
      reason,
      type: event,
      payment: payment?.id,
      customer: payment?.customer,
    }),
  );
};

// Applies a paid charge of the office; returns why it grants nothing. Only extends: an old payment seen again
// (the check reads the latest charges) changes nothing, and keeps pending what may still be paid.
const grant = async (tenant: BillingTenant, payment: AsaasPaymentData): Promise<string | undefined> => {
  if (!tenant.billing) return 'unknown_customer';
  const period = periodOf(payment, tenant.billing, true);
  if (typeof period === 'string') return period;
  if (!period.from) return 'no_payment_date';
  const accessUntil = accessUntilFor(period.plan, period.from);
  const automation = AUTOMATION_PLANS.includes(period.plan);
  const applied =
    tenant.accessUntil &&
    accessUntil <= tenant.accessUntil &&
    (!automation || (tenant.automationUntil && accessUntil <= tenant.automationUntil));
  if (applied) return 'already_applied';
  await billingRepository.extendAccess(tenant.id, accessUntil, automation);
  return undefined;
};

// CHK-09: unknown event, customer or charge is ignored without error (Asaas stops the queue on errors).
export const receiveWebhook = async (body: unknown): Promise<void> => {
  const event = (body as { event?: string } | null)?.event ?? '';
  const granting = PAID_EVENTS.includes(event);
  if (!granting && !REVOKED_EVENTS.includes(event)) return;
  const parsed = asaasWebhookSchema.safeParse(body);
  if (!parsed.success || !parsed.data.payment) return ignore('invalid_payload', body);
  const { payment } = parsed.data;
  const tenant = await billingRepository.findTenantByCustomer(payment.customer);
  if (!tenant?.billing) return ignore('unknown_customer', body);
  if (granting) {
    const reason = await grant(tenant, payment);
    // The same event twice is expected (at least once delivery), not worth a log.
    if (reason && reason !== 'already_applied') ignore(reason, body);
    return;
  }
  const period = periodOf(payment, tenant.billing, false);
  if (typeof period === 'string') return ignore(period, body);
  if (!period.from) return ignore('no_payment_date', body);
  // Back to the start of the period this payment paid; a won chargeback dispute is paid again.
  await billingRepository.revokeAccess(
    tenant.id,
    wallClockToUtc(period.from, '00:00'),
    AUTOMATION_PLANS.includes(period.plan),
  );
};

// The module rule for the other modules (automation and the suggestions, AD-276): the same `hasAutomation` the
// session uses; 403 `automation_required` for an office without the module.
export const ensureAutomation = async (tenantId: string, now = new Date()): Promise<void> => {
  if (!hasAutomation({ automationUntil: await billingRepository.findAutomationUntil(tenantId) }, now)) {
    throw new CustomError('automation_required', 403);
  }
};
