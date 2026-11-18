import { z } from 'zod';

// AD-230: the office pays the Ethica subscription in Asaas. Each confirmed payment extends the
// office access; `trial` once, without renewal and without grace.
export const BILLING_PLANS = ['trial', 'monthly', 'yearly', 'single_month'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

// Yearly = 12 monthly payments with 15% off.
export const BILLING_PLAN_CENTS: Record<BillingPlan, number> = {
  trial: 600,
  monthly: 6000,
  yearly: 61200,
  single_month: 6000,
};

export const BILLING_TRIAL_DAYS = 7;
// Days of access after the due date of a monthly, yearly or single month payment.
export const BILLING_GRACE_DAYS = 5;

export const billingPaySchema = z.object({ plan: z.enum(BILLING_PLANS) }).strict();
export type BillingPay = z.infer<typeof billingPaySchema>;

// `firstPayment`: the office never paid (new sign-up). `canPay`: only the admin pays.
export type BillingView = { firstPayment: boolean; trialAvailable: boolean; canPay: boolean; accessUntil?: string };
